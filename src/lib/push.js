#!/usr/bin/env node
import axios from "axios"
import { flattie } from "flattie"
import * as fs from "fs"

import { BASE_URL } from "../helpers/baseUrl.js"

export const push = async (config) => {
  const projectData = await axios.post(
    BASE_URL + "/project_data/" + config?.projectName,
    {
      projectName: config?.projectName,
      apiKey: process.env.CHAMPO_API_KEY,
    }
  )

  if (config.sourceFile) {
    const fileName = config.sourceFile.replace(/^.*[\\/]/, "")
    const filePath = config.sourceFile
    const fileData = fs.readFileSync(filePath, "utf-8")

    let totalKeys = 0

    try {
      const flat_result = flattie(JSON.parse(fileData))
      totalKeys += Object.entries(flat_result).length
    } catch (error) {
      console.log(
        "Can't count keys from " + fileName + " as it is not JSON formatted"
      )
    }

    console.log("")
    console.log("Total keys: " + totalKeys)
  }

  if (config.translationFolder) {
    let totalKeys = 0
    const inputFiles = fs.readdirSync(
      `${config.translationFolder}/${projectData?.data?.sourceLang?.lang}`
    )
    let fileCount = 0

    for (let file of inputFiles) {
      let isIncluded = false
      if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
        isIncluded = true
      if (config?.includedFiles && (config?.includedFiles).includes(file))
        isIncluded = true
      if (!config?.includedFiles && !config?.excludedFiles) isIncluded = true

      if (isIncluded) {
        const fileName = file
        const filePath =
          `${config.translationFolder}/${projectData?.data?.sourceLang?.lang}/` + fileName
        const fileData = fs.readFileSync(filePath, "utf-8")

        fileCount += 1

        try {
          const flat_result = flattie(JSON.parse(fileData))
          const fileKeys = Object.entries(flat_result).length
          totalKeys = totalKeys + Number(fileKeys || 0)
          console.log(
            fileName + " - " + projectData?.data?.sourceLang?.lang + " - keys: " + fileKeys
          )

          const newkeys = Object.entries(flat_result).map(([key, value]) => {
            return { name: key, lang: projectData?.data?.sourceLang?.lang, value: value }
          })

          let chunks = []
          let indexChunk = 0
          for (let i = 0; i < newkeys.length; i += 50) {
            chunks.push(newkeys.slice(indexChunk * 50, (indexChunk + 1) * 50))
            indexChunk += 1
          }

          for (let chunk of chunks) {
            const result = await axios.post(
              BASE_URL + "/project/" + config?.projectName + "/import_file",
              {
                lang: projectData?.data?.sourceLang?.lang, // temp
                projectName: config?.projectName,
                is_source_lang: true,
                filename: fileName,
                newkeys: chunk,
                apiKey: process.env.CHAMPO_API_KEY,
              }
            )
          }
        } catch (error) {
          console.log(fileName + " - Not handled cause it is not JSON ")
        }
      }
    }

    // for (let outputLang of config.targetLangs) {
    //   const outputFiles = fs.readdirSync(
    //     `${config.translationFolder}/${outputLang}`
    //   )

    //   let fileCount = 0

    //   for (let file of outputFiles) {
    //     let isIncluded = false
    //     if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
    //       isIncluded = true
    //     if (config?.includedFiles && (config?.includedFiles).includes(file))
    //       isIncluded = true
    //     if (!config?.includedFiles && !config?.excludedFiles) isIncluded = true

    //     if (isIncluded) {
    //       const fileName = file
    //       const filePath =
    //         `${config.translationFolder}/${outputLang}/` + fileName
    //       const fileData = fs.readFileSync(filePath, "utf-8")

    //       fileCount += 1

    //       try {
    //         const flat_result = flattie(JSON.parse(fileData))
    //         const fileKeys = Object.entries(flat_result).length
    //         totalKeys = totalKeys + Number(fileKeys || 0)
    //         console.log(fileName + " - " + outputLang + " - keys: " + fileKeys)

    //         const newkeys = Object.entries(flat_result).map(([key, value]) => {
    //           return { name: key, lang: outputLang, value: value }
    //         })

    //         let chunks = []
    //         let indexChunk = 0
    //         for (let i = 0; i < newkeys.length; i += 50) {
    //           chunks.push(newkeys.slice(indexChunk * 50, (indexChunk + 1) * 50))
    //           indexChunk += 1
    //         }

    //         for (let chunk of chunks) {
    //           const result = await axios.post(
    //             BASE_URL + "/project/" +
    //               config?.projectName +
    //               "/import_file",
    //             {
    //               lang: outputLang, // temp
    //               projectName: config?.projectName,
    //               filename: fileName,
    //               newkeys: chunk,
    //               apiKey: process.env.CHAMPO_API_KEY,
    //               is_from_ai: true
    //             }
    //           )
    //         }
    //       } catch (error) {
    //         console.log(fileName + " - Not handled cause it is not JSON ")
    //       }
    //     }
    //   }
    // }

    console.log("")
    console.log("Total JSON keys: " + totalKeys)
  }
}
