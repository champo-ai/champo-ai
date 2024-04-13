#!/usr/bin/env node
import axios from "axios"

import { BASE_URL } from "../helpers/baseUrl.js"
import { writeFile } from "../helpers/writeFile.js"

export const pull = async (config) => {
  console.log("Project selected: " + config?.projectName)
  let totalKeys = 0
  let fileCount = 0

  const projectData = await axios.post(
    BASE_URL + "/project_data/" + config?.projectName,
    {
      projectName: config?.projectName,
      apiKey: process.env.CHAMPO_API_KEY,
    }
  )

  console.log("")
  console.log("Project source lang: " + projectData?.data?.sourceLang?.lang)
  console.log("Target Languages: " + (projectData?.data?.projectLangs?.length - 1))
  console.log(
    "Files: " +
      projectData?.data?.files?.length +
      " files * " +
      (projectData?.data?.projectLangs?.length - 1) +
      " languages = " +
      projectData?.data?.files?.length * (projectData?.data?.projectLangs?.length - 1) +
      " total files"
  )
  console.log("")

  for (let outputLang of projectData?.data?.projectLangs) {
    if (outputLang.lang !== projectData?.data?.sourceLang?.lang) {
      for (let file of projectData?.data?.files) {
        fileCount += 1
        const projectData_json = await axios.post(
          `${BASE_URL}/project/download_file_api/${file.id_file}/lang/${outputLang.lang}`,
          {
            apiKey: process.env.CHAMPO_API_KEY,
          }
        )

        let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""
        const newFileName = `${config.translationFolder}/${aiGeneratedPrefix}${outputLang.lang}/${file.name}`

        writeFile(
          newFileName,
          JSON.stringify(projectData_json.data, null, 2),
          config,
          outputLang.lang
        )
      }

      console.log(
        outputLang.lang +
          " - DONE - " +
          projectData?.data?.files.length +
          " files downloaded"
      )
    }
  }

  console.log("")
  console.log("Total files synced: " + fileCount)
}
