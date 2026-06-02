// metro.transformer.js

const upstreamTransformer = require("@expo/metro-config/babel-transformer")
const svgTransformer = require("react-native-svg-transformer/expo")

module.exports.transform = async function ({ src, filename, ...rest}) {
    if (filename.endsWith(".md")) {
        // Is a markdown file
        const code = `module.exports = ${JSON.stringify(src)};`;
        return upstreamTransformer.transform({ src: code, filename, ...rest});
    }

    if (filename.endsWith(".svg")) {
        return svgTransformer.transform({ src, filename, ...rest});
    }

    return upstreamTransformer.transform({src, filename, ...rest});
}