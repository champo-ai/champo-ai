#!/usr/bin/env node
import axios from "axios"

import { BASE_URL } from "./baseUrl.js"
import { writeFile } from "./writeFile.js"

export const rawTranslateFileData = async (
  inputData,
  fileName,
  totalCost,
  config
) => {
  for (let outputLang of config.targetLangs) {
    try {
      const result = await axios.post(BASE_URL + "/translate", {
        inputData,
        inputLang: config.sourceLang,
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
            result.data.cost.toLocaleString("en-US") +
            "token\n"
        )

        writeFile(newFileName, data, config)
      }

      let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""
      if (config.translationFolder) {
        newFileName = `${config.translationFolder}/${aiGeneratedPrefix}${outputLang}/${fileName}`

        process.stdout.write(
          `${outputLang} - ${fileName}` +
            "\t\t|\t Translation DONE \t|\t" +
            result.data.cost.toLocaleString("en-US") +
            "token\n"
        )

        writeFile(newFileName, data, config, outputLang)
      }
    } catch (error) {
      let newFileName
      let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""
      if (config.translationFolder) {
        newFileName = `${config.translationFolder}/${aiGeneratedPrefix}${outputLang}/champo-error-${fileName}`

        writeFile(newFileName, JSON.stringify(error), config, outputLang)
      }
      if (config.sourceFile) {
        const fileExtension = config.sourceFile.split(".").pop()
        newFileName =
          config.sourceFile.substr(0, config.sourceFile.lastIndexOf("/")) +
          "/champo-error-" +
          outputLang +
          "." +
          fileExtension

        writeFile(newFileName, JSON.stringify(error), config)
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
