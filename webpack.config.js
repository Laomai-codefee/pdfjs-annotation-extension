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
        },
        clean: true
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    module: {
        rules: [
            {
                test: /\.otf$/i,
                resourceQuery: /arraybuffer/,
                type: 'asset/source' // 直接作为原始内容导入
            },
            {
                test: /\.((c|sa|sc)ss)$/i,
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
            },
            {
                test: /\.(j|t)sx?$/,
                use: ['babel-loader'],
                exclude: {
                    and: [/node_modules/],
                    not: [/unfetch/, /d3-array|d3-scale/, /@hapi[\\/]joi-date/]
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
                        plugins: [
                            [
                                'svgo',
                                {
                                    plugins: [{ name: 'removeViewBox', active: false }]
                                }
                            ]
                        ]
                    }
                }
            })
        ]
    },
    cache: {
        type: 'filesystem'
    },
    plugins: [
        new CleanWebpackPlugin({
            verbose: true
        })
    ],
    target: 'web'
}
