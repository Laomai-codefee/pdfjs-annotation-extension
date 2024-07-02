const path = require('path')
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const environment = require('./configuration/environment')

module.exports = {
    entry: {
        'pdfjs-annotation-extension': path.resolve(environment.paths.source, 'index.tsx')
    },
    output: {
        filename: '[name].js',
        path: environment.paths.output,
        library: {
            name: 'PdfjsAnnotationExtension',
            type: 'umd'
        }
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.wasm']
    },
    module: {
        rules: [
            {
                test: /\.((c|sa|sc)ss)$/i,
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
            },
            {
                test: /\.(j|t)sx?$/,
                use: ['babel-loader'],
                exclude: {
                    and: [/node_modules/], // Exclude libraries in node_modules ...
                    not: [
                        // Except for a few of them that needs to be transpiled because they use modern syntax
                        /unfetch/,
                        /d3-array|d3-scale/,
                        /@hapi[\\/]joi-date/
                    ]
                }
            },
            {
                test: /\.(png|jpeg|jpg|gif|svg)$/i,
                type: 'asset',
                generator: {
                    filename: 'images/[name].[hash:6][ext]'
                }
            },
            {
                test: /\.(eot|ttf|woff|woff2)$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8192
                    }
                },
                generator: {
                    filename: 'font/[name].[hash:6][ext]'
                }
            }
        ]
    },
    optimization: {
        minimizer: [
            '...',
            new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.imageminMinify,
                    options: {
                        // Lossless optimization with custom option
                        // Feel free to experiment with options for better result for you
                        plugins: [
                            // Svgo configuration here https://github.com/svg/svgo#configuration
                            [
                                'svgo',
                                {
                                    plugins: [
                                        {
                                            name: 'removeViewBox',
                                            active: false
                                        }
                                    ]
                                }
                            ]
                        ]
                    }
                }
            })
        ]
    },
    plugins: [
        new CleanWebpackPlugin({
            verbose: true,
            cleanOnceBeforeBuildPatterns: ['**/*', '!stats.json']
        })
    ],
    target: 'web'
}
