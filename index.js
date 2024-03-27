#!/usr/bin/env node
import axios from "axios"
import { flattie } from "flattie"
import * as fs from "fs"
import { encode } from "gpt-tokenizer"
import { nestie } from "nestie"
import promptSync from "prompt-sync"

let totalCost = 0
let tokenLimit = 3000
let config
let generatedLangFolderPrefix

const writeFile = (fileName, content, langWanted = null) => {
  if (config.translationFolder) {
    if (
      !fs.existsSync(
        `${config.translationFolder}/${generatedLangFolderPrefix}${langWanted}`
      )
    ) {
      fs.mkdirSync(
        `${config.translationFolder}/${generatedLangFolderPrefix}${langWanted}`
      )
    }
  }

  fs.writeFileSync(fileName, content, (err) => {
    if (err) throw err
  })
}

const createFileChunks = (inputData, fileName) => {
  let chunks = []
  if (fileName.split(".").pop() === "json") {
    let jsonData
    try {
      jsonData = flattie(JSON.parse(inputData))
    } catch (error) {
      throw new Error(
        `Can't parse ${fileName} as JSON, please remove isJson from champo.config.json (this will split file by lines, instead of keys)`
      )
    }

    let chunk = {}
    let lastKeyAdded = ""
    for (const [key, value] of Object.entries(jsonData)) {
      const chunkTokens = encode(JSON.stringify(chunk, null, 2)).length

      if (chunkTokens > 3000) {
        let value = chunk[lastKeyAdded]
        delete chunk[lastKeyAdded]

        chunks.push(chunk)
        chunk = {}
        if (lastKeyAdded !== null) {
          chunk[lastKeyAdded] = value
        }
        lastKeyAdded = null
      } else if (chunkTokens > 2000) {
        chunks.push(chunk)
        chunk = {}
        chunk[key] = value
        lastKeyAdded = null
      } else {
        lastKeyAdded = key
        chunk[key] = value
      }
    }

    chunks.push(chunk)
  }

  return chunks
}

const translateFileData = async (inputData, fileName) => {
  for (let outputLang of config.outputLang) {
    try {
      const result = await axios.post("https://api.champo.ai/translate", {
        inputData,
        inputLang: config.inputLang,
        outputLang: outputLang,
        filename: fileName,
        apiKey: process.env.CHAMPO_API_KEY,
      })

      totalCost += result.data.cost

      let data = result.data.output
      let newFileName

      if (config.sourceFile) {
        const fileExtension = config.sourceFile.split(".").pop()
        newFileName =
          config.sourceFile.substr(0, config.sourceFile.lastIndexOf("/")) +
          "/" +
          outputLang +
          "." +
          fileExtension

        process.stdout.write(
          `${outputLang} - ${fileName}` +
            "\t\t|\t Translation DONE \t|\t" +
            result.data.cost.toFixed(5) +
            "$\n"
        )

        writeFile(newFileName, data)
      }

      if (config.translationFolder) {
        newFileName = `${config.translationFolder}/${generatedLangFolderPrefix}${outputLang}/${fileName}`

        process.stdout.write(
          `${outputLang} - ${fileName}` +
            "\t\t|\t Translation DONE \t|\t" +
            result.data.cost.toFixed(5) +
            "$\n"
        )

        writeFile(newFileName, data, outputLang)
      }
    } catch (error) {
      let newFileName
      if (config.translationFolder) {
        newFileName = `${config.translationFolder}/${generatedLangFolderPrefix}${outputLang}/champo-error-${fileName}`

        writeFile(newFileName, JSON.stringify(error), outputLang)
      }
      if (config.sourceFile) {
        const fileExtension = config.sourceFile.split(".").pop()
        newFileName =
          config.sourceFile.substr(0, config.sourceFile.lastIndexOf("/")) +
          "/champo-error-" +
          outputLang +
          "." +
          fileExtension

        writeFile(newFileName, JSON.stringify(error))
      }

      process.stdout.write(
        `${outputLang} - ${fileName}` + "\t\t|\t" + "ChampollionAI ERROR\n"
      )
      const champollionApiError =
        "ChampollionAI response status : " +
        error.response.status +
        " - " +
        error.response.data
      throw new Error(champollionApiError)
    }
  }
}

const translateFileChunks = async (inputData, fileName) => {
  const fileChunks = createFileChunks(inputData, fileName)

  for (let outputLang of config.outputLang) {
    let chunkIndex = 0
    let fileCost = 0
    let chunkResults = []
    let newFileName
    if (config.translationFolder) {
      newFileName = `${config.translationFolder}/${generatedLangFolderPrefix}${outputLang}/${fileName}`
    }
    if (config.sourceFile) {
      const fileExtension = config.sourceFile.split(".").pop()
      newFileName =
        config.sourceFile.substr(0, config.sourceFile.lastIndexOf("/")) +
        "/" +
        outputLang +
        "." +
        fileExtension
    }

    for (let chunk of fileChunks) {
      chunkIndex++
      let result = await translateFileChunk(
        JSON.stringify(chunk, null, 2),
        fileName,
        chunkIndex,
        fileChunks.length,
        outputLang,
        newFileName
      )

      fileCost += result.cost
      try {
        chunkResults.push(JSON.parse(result.data))
      } catch (error) {
        // Retry only once before thowing error (Not the best but working)
        let result = await translateFileChunk(
          JSON.stringify(chunk, null, 2),
          fileName,
          chunkIndex,
          fileChunks.length,
          outputLang,
          newFileName
        )
        fileCost += result.cost
        chunkResults.push(JSON.parse(result.data))
      }
    }

    if (config.translationFolder) {
      writeFile(
        newFileName,
        JSON.stringify(nestie(Object.assign({}, ...chunkResults)), null, 2),
        outputLang
      )
    }
    if (config.sourceFile) {
      writeFile(
        newFileName,
        JSON.stringify(nestie(Object.assign({}, ...chunkResults)), null, 2),
        outputLang
      )
    }

    for (let i = 0; i < fileChunks.length; i++) {
      fs.unlinkSync(newFileName + `-champo_temp_${i + 1}_${fileChunks.length}`)
    }

    process.stdout.write(
      `${outputLang} - ${fileName}` +
        "\t\t|\t Translation DONE \t|\t" +
        fileCost.toFixed(5) +
        "$\n"
    )
  }
}

const translateFileChunk = async (
  inputData,
  fileName,
  chunkIndex,
  totalChunks,
  outputLang,
  newFileName
) => {
  process.stdout.write(
    outputLang +
      " - " +
      fileName +
      " (" +
      chunkIndex +
      " / " +
      totalChunks +
      ")"
  )
  try {
    const result = await axios.post("https://api.champo.ai/translate_chunk", {
      inputData,
      inputLang: config.inputLang,
      outputLang: outputLang,
      filename: fileName,
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      apiKey: process.env.CHAMPO_API_KEY,
    })

    totalCost += result.data.cost

    writeFile(
      newFileName + `-champo_temp_${chunkIndex}_${totalChunks}`,
      result.data.output,
      outputLang
    )
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    return { data: result.data.output, cost: result.data.cost }
  } catch (error) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(
      `${outputLang} - ${fileName}` + "\t\t|\t" + "ChampollionAI ERROR\n"
    )
    const champollionApiError =
      "ChampollionAI response status : " +
      error?.response?.status +
      " - " +
      error?.response?.data
    writeFile(
      newFileName + `-champo_temp_${chunkIndex}_${totalChunks}`,
      error?.response?.data,
      outputLang
    )
    throw new Error(champollionApiError)
  }
}

const filePrice = (modelUsed, tokenLength) => {
  const gptInputTokenPrice = modelUsed === "gpt-4-turbo-preview" ? 0.125 : 0.025
  const gptOutputTokenPrice =
    modelUsed === "gpt-4-turbo-preview" ? 0.375 : 0.075

  return tokenLength > 0
    ? (tokenLength + 134) * (gptInputTokenPrice / 1000) +
        tokenLength * (gptOutputTokenPrice / 1000)
    : 0
}

async function main() {
  if (config.sourceFile) {
    const fileName = config.sourceFile.replace(/^.*[\\/]/, "")
    const filePath = config.sourceFile
    const fileData = fs.readFileSync(filePath, "utf-8")

    const tokens = encode(fileData)

    let previewedTotalCost =
      filePrice("gpt-3.5-turbo", tokens.length) * config.outputLang.length

    const prompt = promptSync()
    let resultPrompt = prompt(
      `Translate 1 file in ${
        config.outputLang.length
      } lang for ~${previewedTotalCost.toFixed(2)}€ (Y/n):`
    )

    if (resultPrompt === "y" || resultPrompt === "Y" || resultPrompt === "") {
      if (tokens.length + 134 > tokenLimit) {
        await translateFileChunks(fileData, fileName)
      } else {
        await translateFileData(fileData, fileName)
      }

      process.stdout.write("\n")
      process.stdout.write("\nTOTAL Cost : " + totalCost.toFixed(5) + "$\n")
    } else {
      process.stdout.write("\n")
      process.stdout.write("Exited\n")
    }
  }

  if (config.translationFolder) {
    fs.readdir(
      `${config.translationFolder}/${config.inputLang}`,
      async (err, files) => {
        if (err) throw err

        let previewedTotalCost = 0
        let fileCount = 0
        let erroredFilesMessage = []
        for (let file of files) {
          let isIncluded
          if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
            isIncluded = true
          if (config?.includedFiles && (config?.includedFiles).includes(file))
            isIncluded = true
          if (!config?.includedFiles && !config?.excludedFiles)
            isIncluded = true

          if (isIncluded) {
            const fileName = file
            const filePath =
              `${config.translationFolder}/${config.inputLang}/` + fileName
            const fileData = fs.readFileSync(filePath, "utf-8")

            const inputData = fileData
            const tokens = encode(inputData)

            fileCount += 1
            previewedTotalCost +=
              filePrice("gpt-3.5-turbo", tokens.length) *
              config.outputLang.length

            if (
              tokens.length + 134 > tokenLimit &&
              fileName.split(".").pop() !== "json"
            ) {
              erroredFilesMessage.push(
                fileName +
                  " is " +
                  (tokens.length + 134) +
                  " tokens long and not seems to be a JSON file \n\n\x1b[33mIMPORANT\x1b[0m - Try it back in a few days, we will soon have a full file types support!"
              )
            }
          }
        }

        if (erroredFilesMessage.length > 0) {
          erroredFilesMessage.map((item) => process.stdout.write(item + "\n"))
          console.log("\n")
          throw new Error(
            `Some not JSON files exceed token limit (${tokenLimit} tokens), see listed files above:`
          )
        } else {
          const prompt = promptSync()
          let resultPrompt = prompt(
            `Translate ${fileCount} files in ${
              config.outputLang.length
            } lang for ~${previewedTotalCost.toFixed(2)}€ (Y/n):`
          )

          if (
            resultPrompt === "y" ||
            resultPrompt === "Y" ||
            resultPrompt === ""
          ) {
            for (let file of files) {
              let isIncluded
              if (
                config?.excludedFiles &&
                !(config?.excludedFiles).includes(file)
              )
                isIncluded = true
              if (
                config?.includedFiles &&
                (config?.includedFiles).includes(file)
              )
                isIncluded = true
              if (!config?.includedFiles && !config?.excludedFiles)
                isIncluded = true

              if (isIncluded) {
                const fileName = file
                const filePath =
                  `${config.translationFolder}/${config.inputLang}/` + fileName
                const fileData = fs.readFileSync(filePath, "utf-8")

                const tokens = encode(fileData)

                process.stdout.write("\n")
                process.stdout.write(fileName + " - STARTED\n")

                if (tokens.length + 134 > tokenLimit) {
                  await translateFileChunks(fileData, fileName)
                } else {
                  await translateFileData(fileData, fileName)
                }
              }
            }

            process.stdout.write("\n")
            process.stdout.write("TOTAL Cost : " + totalCost.toFixed(5) + "$\n")
          } else {
            process.stdout.write("\n")
            process.stdout.write("Exited\n")
          }
        }
      }
    )
  }
}

if (process.argv.includes("translate")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!process.env.CHAMPO_API_KEY)
    throw new Error(
      "Can't find CHAMPO_API_KEY. Please generate one at https://champollion.ai"
    )
  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )
  if (!config.inputLang)
    throw new Error("Error missing field in config file: inputLang")
  if (!config.outputLang)
    throw new Error("Error missing field in config file: outputLang")
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json"
    )

  generatedLangFolderPrefix = config?.generatedLangFolderPrefix || ""

  process.stdout.write(generatedLangFolderPrefix + "\n")
  main()
}

const countKeys = () => {
  if (config.outputLang.length > 1) {
    console.log(config.outputLang.length + " Languages selected")
  } else {
    console.log(config.outputLang.length + " Languages selected")
  }
  console.log()

  if (config.sourceFile) {
    const fileName = config.sourceFile.replace(/^.*[\\/]/, "")
    const filePath = config.sourceFile
    const fileData = fs.readFileSync(filePath, "utf-8")

    const tokens = encode(fileData)
    let totalKeys = 0
    let previewedTotalCost =
      filePrice("gpt-3.5-turbo", tokens.length) * config.outputLang.length

    try {
      const flat_result = flattie(JSON.parse(inputData))
      totalKeys += Object.entries(flat_result).length
    } catch (error) {
      console.log(
        "Can't count keys from " + fileName + " as it is not JSON formatted"
      )
    }

    console.log("")
    console.log("Total cost preview: " + previewedTotalCost)
    console.log("Total keys: " + totalKeys)
  }

  if (config.translationFolder) {
    let totalKeys = 0
    fs.readdir(
      `${config.translationFolder}/${config.inputLang}`,
      async (err, files) => {
        let previewedTotalCost = 0
        let fileCount = 0

        for (let file of files) {
          let isIncluded = false
          if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
            isIncluded = true
          if (config?.includedFiles && (config?.includedFiles).includes(file))
            isIncluded = true
          if (!config?.includedFiles && !config?.excludedFiles)
            isIncluded = true

          if (isIncluded) {
            const fileName = file
            const filePath =
              `${config.translationFolder}/${config.inputLang}/` + fileName
            const fileData = fs.readFileSync(filePath, "utf-8")

            const inputData = fileData
            const tokens = encode(inputData)
            fileCount += 1
            const fileCost =
              filePrice("gpt-3.5-turbo", tokens.length) *
              config.outputLang.length
            previewedTotalCost += fileCost

            try {
              const flat_result = flattie(JSON.parse(inputData))
              const fileKeys = Object.entries(flat_result).length
              totalKeys = totalKeys + Number(fileKeys || 0)
              console.log(
                fileName +
                  " - cost preview: " +
                  fileCost.toFixed(5) +
                  "€" +
                  " - keys: " +
                  fileKeys
              )
            } catch (error) {
              console.log(
                fileName +
                  " - cost preview: " +
                  fileCost.toFixed(5) +
                  "€" +
                  " - Not parsed cause it is not JSON "
              )
            }
          }
        }

        console.log("")
        console.log(
          "Total cost preview for " +
            config.outputLang.length +
            " language: " +
            previewedTotalCost.toFixed(5) +
            "€"
        )
        console.log("Total JSON keys: " + totalKeys)
      }
    )
  }
}

if (process.argv.includes("preview")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )
  if (!config.inputLang)
    throw new Error("Error missing field in config file: inputLang")
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json"
    )

  // generatedLangFolderPrefix = config?.generatedLangFolderPrefix || ""

  // process.stdout.write(generatedLangFolderPrefix + "\n")
  countKeys()
}
