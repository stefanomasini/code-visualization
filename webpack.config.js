var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: [
        'babel-polyfill',
        //'./src/theme/main.less',
        './js/entrypoint',
        //'webpack-dev-server/client?http://localhost:8080'
    ],
    output: {
        publicPath: '/',
        filename: 'bundle.js'
    },
    debug: true,
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                include: path.join(__dirname, 'js'),
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'stage-0']
                }
            },
            //{
            //    test: /\.less$/,
            //    loader: "style!css!autoprefixer!less"
            //},
        ]
    },
    devServer: {
        contentBase: "."
    }
};


//module.exports = {
//    loaders: [
//        {
//            //loader: "babel-loader",
//
//            // Skip any files outside of your project's `src` directory
//            //include: [
//            //    path.resolve(__dirname, "js"),
//            //],
//
//            // Only run `.js` and `.jsx` files through Babel
//            //test: /\.jsx?$/,
//
//            // Options to configure babel with
//            //query: {
//            //    plugins: ['transform-runtime'],
//            //    presets: ['es2015', 'stage-0', 'react'],
//            //}
//
//            debug: true,
//            devtool: 'source-map',
//            entry: [
//                'babel-polyfill',
//                //'./src/theme/main.less',
//                './js/entrypoiny',
//                'webpack-dev-server/client?http://localhost:8080'
//            ],
//            output: {
//                publicPath: '/',
//                filename: 'bundle.js'
//            },
//
//        },
//    ]
//};
