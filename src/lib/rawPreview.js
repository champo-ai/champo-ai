#!/usr/bin/env node
import { flattie } from "flattie"
import * as fs from "fs"
import { encode } from "gpt-tokenizer"


export const rawPreview = (config) => {
  if (config.targetLangs.length > 1) {
    console.log(config.targetLangs.length + " Languages selected")
  } else {
    console.log(config.targetLangs.length + " Languages selected")
  }
  console.log()

  if (config.sourceFile) {
    const fileName = config.sourceFile.replace(/^.*[\\/]/, "")
    const filePath = config.sourceFile
    const fileData = fs.readFileSync(filePath, "utf-8")

    const tokens = encode(fileData)
    let totalKeys = 0
    let previewedTotalCost = tokens.length * config.targetLangs.length

    try {
      const flat_result = flattie(JSON.parse(fileData))
      const fileKeys = Object.entries(flat_result).length
      totalKeys += fileKeys

      console.log(
        fileName +
          " - keys: " +
          fileKeys +
          " - cost preview: " +
          tokens.length +
          " tokens"
      )
    } catch (error) {
      console.log(error)

      console.log(
        fileName +
          " - Not parsed cause it is not JSON " +
          " - cost preview: " +
          tokens.length +
          " tokens"
      )
    }

    console.log("")
    console.log("Total cost preview: " + previewedTotalCost + " tokens")
    console.log("Total keys: " + totalKeys)
  }

  if (config.translationFolder) {
    let totalKeys = 0
    fs.readdir(
      `${config.translationFolder}/${config.sourceLang}`,
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
              `${config.translationFolder}/${config.sourceLang}/` + fileName
            const fileData = fs.readFileSync(filePath, "utf-8")

            const inputData = fileData
            const tokens = encode(inputData)
            fileCount += 1
            previewedTotalCost += tokens.length * config.targetLangs.length

            try {
              const flat_result = flattie(JSON.parse(inputData))
              const fileKeys = Object.entries(flat_result).length
              totalKeys = totalKeys + Number(fileKeys || 0)
              console.log(
                fileName +
                  " - keys: " +
                  fileKeys +
                  " - cost preview: " +
                  tokens.length +
                  " tokens"
              )
            } catch (error) {
              console.log(
                fileName +
                  " - Not parsed cause it is not JSON " +
                  " - cost preview: " +
                  tokens.length +
                  " tokens"
              )
            }
          }
        }

        console.log("")
        console.log(
          "Total cost preview for " +
            config.targetLangs.length +
            (config.targetLangs.length > 1 ? " languages: " : " language: ") +
            previewedTotalCost.toLocaleString("en-US") +
            " tokens"
        )
        console.log("Total JSON keys: " + totalKeys)
      }
    )
  }
}
