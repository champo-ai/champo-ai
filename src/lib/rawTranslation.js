#!/usr/bin/env node
import * as fs from "fs"
import { encode } from "gpt-tokenizer"
import promptSync from "prompt-sync"

import { filePrice } from "../helpers/filePrice.js"
import { rawTranslateFileChunks } from "../helpers/rawTranslateFileChunks.js"
import { rawTranslateFileData } from "../helpers/rawTranslateFileData.js"

let totalCost = 0
let tokenLimit = 3000

export async function rawTranslation(config) {
  if (config.sourceFile) {
    const fileName = config.sourceFile.replace(/^.*[\\/]/, "")
    const filePath = config.sourceFile
    const fileData = fs.readFileSync(filePath, "utf-8")

    const tokens = encode(fileData)

    let previewedTotalCost = tokens.length * config.targetLangs.length

    const prompt = promptSync()
    let resultPrompt = prompt(
      `Translate 1 file in ${
        config.targetLangs.length
      } lang for ~${previewedTotalCost.toLocaleString("en-US")}€ (Y/n):`
    )

    if (resultPrompt === "y" || resultPrompt === "Y" || resultPrompt === "") {
      if (tokens.length + 134 > tokenLimit) {
        await rawTranslateFileChunks(fileData, fileName, totalCost, config)
      } else {
        await rawTranslateFileData(fileData, fileName, totalCost, config)
      }

      process.stdout.write("\n")
      process.stdout.write("\nTOTAL Cost : " + totalCost.toLocaleString("en-US") + "token\n")
    } else {
      process.stdout.write("\n")
      process.stdout.write("Exited\n")
    }
  }

  if (config.translationFolder) {
    fs.readdir(
      `${config.translationFolder}/${config.sourceLang}`,
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
              `${config.translationFolder}/${config.sourceLang}/` + fileName
            const fileData = fs.readFileSync(filePath, "utf-8")

            const inputData = fileData
            const tokens = encode(inputData)

            fileCount += 1
            previewedTotalCost += tokens.length * config.targetLangs.length

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
              config?.targetLangs.length
            } lang for ~${previewedTotalCost.toLocaleString("en-US")} tokens (Y/n):`
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
                  `${config.translationFolder}/${config.sourceLang}/` + fileName
                const fileData = fs.readFileSync(filePath, "utf-8")

                const tokens = encode(fileData)

                process.stdout.write("\n")
                process.stdout.write(fileName + " - STARTED\n")

                if (tokens.length + 134 > tokenLimit) {
                  await rawTranslateFileChunks(fileData, fileName, totalCost, config)
                } else {
                  await rawTranslateFileData(fileData, fileName, totalCost, config)
                }
              }
            }

            process.stdout.write("\n")
            process.stdout.write("TOTAL Cost : " + totalCost.toLocaleString("en-US") + "token\n")
          } else {
            process.stdout.write("\n")
            process.stdout.write("Exited\n")
          }
        }
      }
    )
  }
}
