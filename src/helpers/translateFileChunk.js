import axios from "axios"
import { BASE_URL } from "./baseUrl.js"

export const translateFileChunk = async (
  inputData,
  fileName,
  chunkIndex,
  totalChunks,
  outputLang,
  inputLang
) => {
  try {
    const result = await axios.post(BASE_URL + "/translate_chunk", {
      inputData,
      inputLang: inputLang,
      outputLang: outputLang,
      filename: fileName,
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      apiKey: process.env.CHAMPO_API_KEY,
    })

    return { data: result.data.output, cost: result.data.cost }
  } catch (error) {
    throw new Error(error?.response?.data)
  }
}
