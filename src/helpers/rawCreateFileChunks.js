#!/usr/bin/env node
import { flattie } from "flattie"
import { encode } from "gpt-tokenizer"

export const rawCreateFileChunks = (inputData, fileName) => {
  let chunks = []
  if (fileName.split(".").pop() === "json") {
    let jsonData
    try {
      jsonData = flattie(JSON.parse(inputData))
    } catch (error) {
      throw new Error(
        `Can't parse ${fileName} as JSON.`
      )
    }

    let chunk = {}
    let lastKeyAdded = ""
    for (const [key, value] of Object.entries(jsonData)) {
      const chunkTokens = encode(JSON.stringify(chunk, null, 2)).length

      if (chunkTokens > 2000) {
        let value = chunk[lastKeyAdded]
        delete chunk[lastKeyAdded]

        chunks.push(chunk)
        chunk = {}
        if (lastKeyAdded !== null) {
          chunk[lastKeyAdded] = value
        }
        lastKeyAdded = null
      } else if (chunkTokens > 1000) {
        chunks.push(chunk)
        chunk = {}
        chunk[key] = value
        lastKeyAdded = null
      } else {
        lastKeyAdded = key
        chunk[key] = value
      }
    }

    chunks.push(chunk)
  }

  return chunks
}
