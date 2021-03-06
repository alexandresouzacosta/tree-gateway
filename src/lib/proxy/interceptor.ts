"use strict";

import * as StringUtils from "underscore.string";
import * as config from "../config";
import {AutoWired, Inject} from "typescript-ioc";
import {Settings} from "../settings";
import * as path from "path"; 
 
@AutoWired
export class ProxyInterceptor {
    @Inject
    private settings: Settings;
    
    requestInterceptor(proxy: config.Proxy) {
        if (this.hasRequestInterceptor(proxy)) {
          return (this.buildRequestInterceptor(proxy));
        }
        return null;
    }

    responseInterceptor(proxy: config.Proxy) {
        if (this.hasResponseInterceptor(proxy)) {
          return (this.buildResponseInterceptor(proxy));
        }
        return null;
    }

    private buildRequestInterceptor(proxy: config.Proxy) {
        let func = new Array<string>();
        func.push("function(proxyReq, originalReq){");
        proxy.interceptor.request.forEach((interceptor, index)=>{
            let p = path.join(this.settings.middlewarePath, 'interceptor', 'request' ,interceptor);                
            func.push("proxyReq = require('"+p+"')(proxyReq, originalReq);");
        });
        func.push("return proxyReq;");
        func.push("}");
        let f;
        eval('f = '+func.join(''))
        return f;
    }
    //  * module.exports = function(rsp, data, req, res, callback) {
    //  *    // rsp - original response from the target 
    //  *    data = JSON.parse(data.toString('utf8'));
    //  *    callback(null, JSON.stringify(data));
    //  *    // callback follow the node conventions ```callback(error, value)```
    //  * };

    private buildResponseInterceptor(proxy: config.Proxy) {
        let func = new Array<string>();
        func.push("function(rsp, data, req, res, callback){");
        proxy.interceptor.response.forEach((interceptor, index)=>{
            let p = path.join(this.settings.middlewarePath, 'interceptor', 'response' ,interceptor);                
            func.push("require('"+p+"')(rsp, data, req, res, (error, value)=>{ \
                if (error) { \
                   callback(error); \
                   return; \
                } \
                data = value;"
            );
        });
        proxy.interceptor.response.forEach((interceptor, index)=>{
            if (index == 0) {
                func.push("callback(null, data);");
            }
            func.push("});");
        });
        func.push("}");
        let f;
        eval('f = '+func.join(''))
        return f;
    }

    private hasRequestInterceptor(proxy: config.Proxy) {
        return (proxy.interceptor && proxy.interceptor.request && proxy.interceptor.request.length > 0);
    }

    private hasResponseInterceptor(proxy: config.Proxy) {
        return (proxy.interceptor && proxy.interceptor.response && proxy.interceptor.response.length > 0);
    }
}  