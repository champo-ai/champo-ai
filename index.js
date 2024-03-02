#!/usr/bin/env node
import * as fs from 'fs'
import axios from 'axios'

let totalCost = 0
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

const translatteFileData = async (inputData, fileName, ) => {
  for (let outputLang of config.outputLang) {
    try {
      const result = await axios.post('https://api.champollion.ai/translate', {
        inputData,
        inputLang: config.inputLang,
        outputLang: outputLang,
        filename: fileName,
        apiKey: process.env.CHAMPOLLION_API_KEY,
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

async function main() {
  fs.readdir(
    `${config.translationFolder}/${config.inputLang}`,
    async (err, files) => {
      if (err) throw err

      for (let file of files) {
        let isIncluded
        if (config?.excludedFiles && !(config?.excludedFiles).includes(file))
          isIncluded = true
        if (config?.includedFiles && (config?.includedFiles).includes(file))
          isIncluded = true

        if (isIncluded) {
          const fileName = file
          const filePath =
          `${config.translationFolder}/${config.inputLang}/` + fileName
          const fileData = fs.readFileSync(filePath, 'utf-8')
          

          const inputData = fileData

          console.log(fileName + ' - STARTED')
          await translatteFileData(inputData, fileName)
        }
      }

      console.log('TOTAL Cost : ' + totalCost.toFixed(5) + '$')
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

  if (!process.env.CHAMPOLLION_API_KEY)
    throw new Error(
      "Can't find CHAMPOLLION_API_KEY. Please generate one at https://champollion.ai",
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
