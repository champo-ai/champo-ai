#!/usr/bin/env node
import axios from "axios"

import { writeFile } from "./writeFile.js"
import { BASE_URL } from "./baseUrl.js"

export const rawTranslateFileChunk = async (
  inputData,
  fileName,
  chunkIndex,
  totalChunks,
  outputLang,
  newFileName,
  totalCost,
  config
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
    const result = await axios.post(BASE_URL + "/translate_chunk", {
      inputData,
      inputLang: config.sourceLang,
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
      config,
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
      config,
      outputLang
    )
    throw new Error(champollionApiError)
  }
}
