#!/usr/bin/env node
import * as fs from 'fs'
import axios from 'axios'
import { encode } from 'gpt-tokenizer'
import promptSync from 'prompt-sync'

let totalCost = 0
let tokenLimit = 4000
let config
let generatedLangFolderPrefix

const writeFile = (fileName, content, langWanted) => {
  if (
    !fs.existsSync(
      `${config.translationFolder}/${generatedLangFolderPrefix}${langWanted}`,
    )
  ) {
    fs.mkdirSync(
      `${config.translationFolder}/${generatedLangFolderPrefix}${langWanted}`,
    )
  }

  fs.writeFileSync(fileName, content, (err) => {
    if (err) throw err
  })
}

const translateFileData = async (inputData, fileName) => {
  for (let outputLang of config.outputLang) {
    try {
      const result = await axios.post('https://api.champo.ai/translate', {
        inputData,
        inputLang: config.inputLang,
        outputLang: outputLang,
        filename: fileName,
        apiKey: process.env.CHAMPO_API_KEY,
      })

      totalCost += result.data.cost

      let data = result.data.output
      let newFileName = `${config.translationFolder}/${generatedLangFolderPrefix}${outputLang}/${fileName}`

      console.log(
        `${outputLang} - ${fileName}` +
          '\t\t|\t Translation DONE \t|\t' +
          result.data.cost.toFixed(5) +
          '$',
      )

      writeFile(newFileName, data, outputLang)
    } catch (error) {
      let newFileName = `${config.translationFolder}/${generatedLangFolderPrefix}${outputLang}/champo-error-${fileName}`

      writeFile(newFileName, JSON.stringify(error), outputLang)

      console.log(
        `${outputLang} - ${fileName}` + '\t\t|\t' + 'ChampollionAI ERROR',
      )
      const champollionApiError =
        'ChampollionAI response status : ' +
        error.response.status +
        ' - ' +
        error.response.data
      throw new Error(champollionApiError)
    }
  }
  console.log(' ')
}

const filePrice = (modelUsed, tokenLength) => {
  const gptInputTokenPrice = modelUsed === 'gpt-4-turbo-preview' ? 0.125 : 0.025
  const gptOutputTokenPrice =
    modelUsed === 'gpt-4-turbo-preview' ? 0.375 : 0.075

  return tokenLength > 0
    ? (tokenLength + 134) * (gptInputTokenPrice / 1000) +
        tokenLength * (gptOutputTokenPrice / 1000)
    : 0
}

async function main() {
  fs.readdir(
    `${config.translationFolder}/${config.inputLang}`,
    async (err, files) => {
      if (err) throw err

      let erroredFilesMessage = []
      let previewedTotalCost = 0
      let fileCount = 0
      for (let file of files) {
        let isIncluded
        if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
          isIncluded = true
        if (config?.includedFiles && (config?.includedFiles).includes(file))
          isIncluded = true
        if (!config?.includedFiles && !config?.excludedFiles) isIncluded = true

        if (isIncluded) {
          const fileName = file
          const filePath =
            `${config.translationFolder}/${config.inputLang}/` + fileName
          const fileData = fs.readFileSync(filePath, 'utf-8')

          const inputData = fileData
          const tokens = encode(inputData)
          
          fileCount += 1
          previewedTotalCost +=
            filePrice('gpt-3.5-turbo', tokens.length) * config.outputLang.length

          if (tokens.length + 134 > tokenLimit) {
            erroredFilesMessage.push(
              fileName + ' is ' + (tokens.length + 134) + ' tokens length.',
            )
          }
        }
      }

      if (erroredFilesMessage.length > 0) {
        erroredFilesMessage.map((item) => console.log(item))
        console.log('')
        throw new Error(
          `Some files exceed token limit (${tokenLimit} tokens), see listed files above:`,
        )
      } else {
        const prompt = promptSync()
        let resultPrompt = prompt(
          `Translate ${fileCount} files in ${
            config.outputLang.length
          } lang for ~${previewedTotalCost.toFixed(2)}€ (Y/n):`,
        )

        if (
          resultPrompt === 'y' ||
          resultPrompt === 'Y' ||
          resultPrompt === ''
        ) {
          for (let file of files) {
            let isIncluded
            if (
              config?.excludedFiles &&
              !(config?.excludedFiles).includes(file)
            )
              isIncluded = true
            if (config?.includedFiles && (config?.includedFiles).includes(file))
              isIncluded = true
            if (!config?.includedFiles && !config?.excludedFiles)
              isIncluded = true

            if (isIncluded) {
              const fileName = file
              const filePath =
                `${config.translationFolder}/${config.inputLang}/` + fileName
              const fileData = fs.readFileSync(filePath, 'utf-8')

              const inputData = fileData

              console.log('')
              console.log(fileName + ' - STARTED')
              await translateFileData(inputData, fileName)
            }
          }
          console.log('TOTAL Cost : ' + totalCost.toFixed(5) + '$')
        } else {
          console.log('')
          console.log('Exited')
        }
      }
    },
  )
}

if (process.argv.includes('translate')) {
  try {
    config = JSON.parse(fs.readFileSync('./champo.config.json', 'utf8'))
  } catch (error) {
    throw new Error(
      'Error parsing config file. Have you created a ./champo.config.json config file ?',
    )
  }

  if (!process.env.CHAMPO_API_KEY)
    throw new Error(
      "Can't find CHAMPO_API_KEY. Please generate one at https://champollion.ai",
    )
  if (!config.translationFolder)
    throw new Error('Error missing field in config file: translationFolder')
  if (!config.inputLang)
    throw new Error('Error missing field in config file: inputLang')
  if (!config.outputLang)
    throw new Error('Error missing field in config file: outputLang')
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json",
    )

  generatedLangFolderPrefix = config?.generatedLangFolderPrefix || ''

  console.log(generatedLangFolderPrefix)
  main()
}
