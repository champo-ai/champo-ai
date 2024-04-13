#!/usr/bin/env node

export const filePrice = (modelUsed, tokenLength) => {
  const gptInputTokenPrice = modelUsed === "gpt-4-turbo-preview" ? 0.125 : 0.025
  const gptOutputTokenPrice =
    modelUsed === "gpt-4-turbo-preview" ? 0.375 : 0.075

  return tokenLength > 0
    ? (tokenLength + 134) * (gptInputTokenPrice / 1000) +
        tokenLength * (gptOutputTokenPrice / 1000)
    : 0
}