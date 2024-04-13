#!/usr/bin/env node
import * as fs from "fs"

export const writeFile = (fileName, content, config, langWanted = null) => {
  if (config.translationFolder) {
    let aiGeneratedPrefix = config?.aiGeneratedPrefix || ""

    if (
      !fs.existsSync(
        `${config.translationFolder}/${aiGeneratedPrefix}${langWanted}`
      )
    ) {
      fs.mkdirSync(
        `${config.translationFolder}/${aiGeneratedPrefix}${langWanted}`
      )
    }
  }

  fs.writeFileSync(fileName, content, (err) => {
    if (err) throw err
  })
}