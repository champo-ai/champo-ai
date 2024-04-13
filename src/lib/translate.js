import axios from "axios"
import { BASE_URL } from "../helpers/baseUrl.js"
import { createFileChunks } from "../helpers/createFileChunks.js"
import { translateFileChunks } from "../helpers/translateFileChunks.js"

const langCount = (projectLangProgressions, lang) => {
  const projectLang = projectLangProgressions?.find((i) => i.lang === lang)
  if (projectLang) {
    return projectLangProgressions?.find((i) => i.lang === lang)
  } else {
    return { valid: 0, ai_generated: 0 }
  }
}

const langFileCount = (projectLangProgressions, lang, file_id) => {
  const projectLang = projectLangProgressions?.find((i) => i.lang === lang)
  if (projectLang) {
    const currentFile = projectLang.files.find(
      (file) => file.file_id === file_id
    )
    if (currentFile) {
      return currentFile
    } else {
      return { valid: 0, ai_generated: 0 }
    }
  } else {
    return { valid: 0, ai_generated: 0 }
  }
}

const totalFileKeys = (projectLangProgressions, sourceLang, file_id) => {
  const projectLang = projectLangProgressions?.find(
    (i) => i.lang === sourceLang
  )

  if (projectLang) {
    const currentFile = projectLang.files.find(
      (file) => file.file_id === file_id
    )
    if (currentFile) {
      return currentFile.ai_generated + currentFile.valid
    } else {
      return 0
    }
  } else {
    return 0
  }
}

const generateMissingFileKeys = async ({
  lang,
  file,
  totalCost,
  projectData,
  config,
  noRefresh = false,
}) => {
  const result = await axios.post(
    `${BASE_URL}/project/get_missing_keys/${file.id_file}/lang/${lang.lang}`,
    {
      apiKey: process.env.CHAMPO_API_KEY,
    }
  )

  const fileData = JSON.stringify(result.data, null, 2)

  const chunks = createFileChunks(fileData, file.name)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(
    lang.lang + " - " + file.name + " - STARTED (" + chunks.length + " chunks)"
  )
  const translatedResult = await translateFileChunks(
    lang,
    file.name,
    chunks,
    projectData?.data?.sourceLang?.lang
  )
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(
    lang.lang +
      " - " +
      file.name +
      " - TRANSLATED (" +
      chunks.length +
      " chunks)"
  )

  if (translatedResult?.chunkResults) {
    // Merge chunks
    let translatedData = []
    for (let chunk of translatedResult?.chunkResults) {
      translatedData = { ...translatedData, ...chunk }
    }

    // New key payload
    const newkeys = Object.entries(translatedData).map(([key, value]) => {
      return {
        name: key,
        lang: lang.lang,
        value: value,
      }
    })

    // Create chunk of 50 translated keys to send to ChampoAI API
    let tranlatedChunks = []
    let indexChunk = 0
    for (let i = 0; i < newkeys.length; i += 50) {
      tranlatedChunks.push(
        newkeys.slice(indexChunk * 50, (indexChunk + 1) * 50)
      )
      indexChunk += 1
    }

    // Send all chunks of 50 translated keys to ChampoAI API
    for (let chunk of tranlatedChunks) {
      await axios.post(
        BASE_URL + "/project/" + projectData.data.project.name + "/import_file",
        {
          lang: lang.lang, // temp
          projectName: projectData.data.project.name,
          is_source_lang: false,
          filename: file.name,
          newkeys: chunk,
          apiKey: process.env.CHAMPO_API_KEY,
        }
      )
    }

    return translatedResult?.fileCost
  } else {
    return 0
  }
}

export const translate = async (config) => {
  try {
    const projectData = await axios.post(
      BASE_URL + "/project_data/" + config?.projectName,
      {
        projectName: config?.projectName,
        apiKey: process.env.CHAMPO_API_KEY,
      }
    )

    const projectLangProgressions = await axios.post(
      BASE_URL +
        "/project/" +
        projectData.data.project.id_project +
        "/lang_progressions",
      {
        apiKey: process.env.CHAMPO_API_KEY,
      }
    )

    const sourceLangProgression = projectLangProgressions.data.find(
      (i) => i.lang === projectData.data.sourceLang.lang
    )
    const totalKeys =
      sourceLangProgression.valid + sourceLangProgression.ai_generated
    const outputLangs = projectData.data.projectLangs.filter(
      (i) => i.is_source_lang === false
    )
    let currentCost = 0

    if (projectData && projectLangProgressions) {
      for (let lang of outputLangs.filter(
        (l) =>
          Number(
            Number(totalKeys || 0) -
              (langCount(projectLangProgressions.data, l?.lang)?.ai_generated +
                langCount(projectLangProgressions.data, l?.lang)?.valid)
          ) > 0
      )) {
        process.stdout.write("\n")

        if (
          projectData.data.files &&
          outputLangs.reduce(
            (acc, l) =>
              acc +
              Number(
                Number(totalKeys || 0) -
                  (langCount(projectLangProgressions.data, l?.lang)
                    ?.ai_generated +
                    langCount(projectLangProgressions.data, l?.lang)?.valid)
              ),
            0
          ) > 0
        ) {
          const files = []

          // Filter missing key files
          projectData.data.files.map((file) => {
            if (
              Number(
                totalFileKeys(
                  projectLangProgressions.data,
                  projectData.data.sourceLang.lang,
                  file.id_file
                ) -
                  (langFileCount(
                    projectLangProgressions.data,
                    lang?.lang,
                    file.id_file
                  )?.ai_generated +
                    langFileCount(
                      projectLangProgressions.data,
                      lang?.lang,
                      file.id_file
                    )?.valid) >
                  0
              )
            ) {
              files.push(file)
            }
            return file
          })

          // Generate missing key, over missing key files
          let langCost = 0
          for (let file of files) {
            const fileCost = await generateMissingFileKeys({
              lang: lang,
              file,
              noRefresh: true,
              costIncrement: currentCost,
              config,
              projectData: projectData,
            })
            currentCost += fileCost
            langCost += fileCost
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            process.stdout.write(
              lang.lang +
                " - " +
                file.name +
                " - DONE (" +
                fileCost +
                " tokens)\n"
            )
          }
          console.log(lang.lang + " total cost: " + langCost + " tokens")
        }
      }
      console.log("")
      console.log("TOTAL cost: " + currentCost + " tokens")
    } else {
      console.error("Project not found")
    }
  } catch (error) {
    console.error(error)
  }
}

// FOR ONE LANG ONLY

// const generateLangMissingKey = async () => {
//   try {
//     if (selectedProjectFiles && selectedLang && projectLangProgressions) {
//       const files = []
//       setPreventDoubleSubmit(true)

//       selectedProjectFiles.map((file) => {
//         if (
//           Number(file.fileKeyCount || 0) -
//             (langFileCount(selectedLang?.lang, file.id_file)?.ai_generated +
//               langFileCount(selectedLang?.lang, file.id_file)?.valid) >
//           0
//         ) {
//           files.push(file)
//         }
//         return file
//       })

//       setTotalCost(0)

//       setModalLangTranslationIsShown(true)
//       let currentCost = 0
//       for (let file of files) {
//         const fileCost = await generateMissingFileKeys({
//           lang: selectedLang,
//           file,
//           noRefresh: true,
//           costIncrement: currentCost,
//         })
//         currentCost += fileCost
//         console.log(currentCost)
//       }
//       setTotalCost(currentCost)

//       refreshProjects()
//       setPreventDoubleSubmit(false)
//     }
//   } catch (error) {}
// }
