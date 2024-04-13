#!/usr/bin/env node
import * as fs from "fs"
import { nestie } from "nestie"

import { rawCreateFileChunks } from "./rawCreateFileChunks.js"
import { rawTranslateFileChunk } from "./rawTranslateFileChunk.js"
import { writeFile } from "./writeFile.js"

export const rawTranslateFileChunks = async (
  inputData,
  fileName,
  totalCost,
  config
) => {
  const fileChunks = rawCreateFileChunks(inputData, fileName)

  for (let outputLang of config.targetLangs) {
    let chunkIndex = 0
    let fileCost = 0
    let chunkResults = []
    let newFileName
    if (config.translationFolder) {
      let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""
      newFileName = `${config.translationFolder}/${aiGeneratedPrefix}${outputLang}/${fileName}`
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
      let result = await rawTranslateFileChunk(
        JSON.stringify(chunk, null, 2),
        fileName,
        chunkIndex,
        fileChunks.length,
        outputLang,
        newFileName,
        totalCost,
        config
      )

      fileCost += result.cost
      try {
        chunkResults.push(JSON.parse(result.data))
      } catch (error) {
        // Retry only once before thowing error (Not the best but working)
        let result = await rawTranslateFileChunk(
          JSON.stringify(chunk, null, 2),
          fileName,
          chunkIndex,
          fileChunks.length,
          outputLang,
          newFileName,
          totalCost,
          config
        )
        fileCost += result.cost
        chunkResults.push(JSON.parse(result.data))
      }
    }

    if (config.translationFolder) {
      writeFile(
        newFileName,
        JSON.stringify(nestie(Object.assign({}, ...chunkResults)), null, 2),
        config,
        outputLang
      )
    }
    if (config.sourceFile) {
      writeFile(
        newFileName,
        JSON.stringify(nestie(Object.assign({}, ...chunkResults)), null, 2),
        config,
        outputLang
      )
    }

    for (let i = 0; i < fileChunks.length; i++) {
      fs.unlinkSync(newFileName + `-champo_temp_${i + 1}_${fileChunks.length}`)
    }

    process.stdout.write(
      `${outputLang} - ${fileName}` +
        "\t\t|\t Translation DONE \t|\t" +
        fileCost.toLocaleString("en-US") +
        "token\n"
    )
  }
}
