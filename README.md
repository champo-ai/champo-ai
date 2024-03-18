<!-- Banner Image -->

<p align="center">
  <a href="https://champo.ai/">
    <img alt="ChampoAI" height="128" src="https://www.champollion.ai/logo512.png">
    <h1 align="center">Seamlessly Translate and Maintain your Apps with ChampoAI</h1>
  </a>
</p>

### Get started

- Install package

```sh
npm i champo-ai
# or
yarn add champo-ai
```

- Create a champo.config.json at root of your project

```json
{
  "translationFolder": "./translations",
  "inputLang": "fr-FR",
  "outputLang": ["en-US", "es-ES", "it-IT"],
  
  // optionnal
  "excludedFiles": ["file_excluded.ts"],
  "includedFiles": ["file_to_translate.json"],
  "generatedLangFolderPrefix": "ai-generated_"
}
```

- Export your api key

```sh
export CHAMPO_API_KEY=your_api_key # replace with yours
```

- Run translation script

```sh
npx champo translate
```

It will translate all files in ./{translationFolder}/{inputLang} in desired languages automatically.