#!/usr/bin/env node
import * as fs from "fs"

import { rawPreview } from "./lib/rawPreview.js"
import { pull } from "./lib/pull.js"
import { push } from "./lib/push.js"
import { rawTranslation } from "./lib/rawTranslation.js"
import { translate } from "./lib/translate.js"

let config



if (process.argv.includes("push")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json"
    )

  // aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

  // process.stdout.write(aiGeneratedPrefix + "\n")
  push(config)
}

if (process.argv.includes("translate")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!config.projectName)
    throw new Error("Error missing field in config file: projectName")

  // if (!config.translationFolder && !config.sourceFile)
  //   throw new Error(
  //     "Error missing field in config file: translationFolder OR sourceFile"
  //   )
  // if (config.translationFolder && config.sourceFile)
  //   throw new Error(
  //     "Error in config file: translationFolder AND sourceFile are both set"
  //   )

  // let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

  // process.stdout.write(aiGeneratedPrefix + "\n")
  translate(config)
}

if (process.argv.includes("pull")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!config.projectName)
    throw new Error("Error missing field in config file: projectName")

  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )

  // let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

  // process.stdout.write(aiGeneratedPrefix + "\n")
  pull(config)
}

if (process.argv.includes("raw-translation")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!process.env.CHAMPO_API_KEY)
    throw new Error(
      "Can't find CHAMPO_API_KEY. Please generate one at https://champollion.ai"
    )
  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )
  if (!config.sourceLang)
    throw new Error("Error missing field in config file: sourceLang")
  if (!config.targetLangs)
    throw new Error("Error missing field in config file: targetLangs")
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json"
    )

  let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

  process.stdout.write(aiGeneratedPrefix + "\n")
  rawTranslation(config)
}

if (process.argv.includes("raw-preview")) {
  try {
    config = JSON.parse(fs.readFileSync("./champo.config.json", "utf8"))
  } catch (error) {
    throw new Error(
      "Error parsing config file. Have you created a ./champo.config.json config file ?"
    )
  }

  if (!config.translationFolder && !config.sourceFile)
    throw new Error(
      "Error missing field in config file: translationFolder OR sourceFile"
    )
  if (config.translationFolder && config.sourceFile)
    throw new Error(
      "Error in config file: translationFolder AND sourceFile are both set"
    )
  if (!config.sourceLang)
    throw new Error("Error missing field in config file: sourceLang")
  if (!config.targetLangs)
    throw new Error("Error missing field in config file: targetLangs")
  if (config?.excludedFiles && config?.includedFiles)
    throw new Error(
      "Can't set excludedFiles AND includedFiles in champo.config.json"
    )

  // aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

  // process.stdout.write(aiGeneratedPrefix + "\n")
  rawPreview(config)
}