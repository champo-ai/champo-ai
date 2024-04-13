import { translateFileChunk } from "./translateFileChunk.js"

export const translateFileChunks = async (
  lang,
  fileName,
  fileChunks,
  inputLang
) => {
  let chunkIndex = 0
  let fileCost = 0
  let chunkResults = []

  for (let chunk of fileChunks) {
    chunkIndex++

    let result = await translateFileChunk(
      JSON.stringify(chunk, null, 2),
      fileName,
      chunkIndex,
      fileChunks.length,
      lang.lang,
      inputLang
    )

    try {
      fileCost += result?.cost
      chunkResults.push(JSON.parse(result?.data))
    } catch (error) {
      // Retry only once before thowing error (Not the best but working)
      let result = await translateFileChunk(
        JSON.stringify(chunk, null, 2),
        fileName,
        chunkIndex,
        fileChunks.length,
        lang.lang,
        inputLang
      )
      
      fileCost += Number(result?.cost || 0)
      chunkResults.push(JSON.parse(result?.data))
    }
  }

  return { chunkResults, fileCost }
}
