import { getServerHealth, Connection } from '../helpers/common';
import { getTxHashFromTxHex, fromHex, arrayBufferToBase64 } from '../helpers/aux';

const WebSocket = require('ws'); //Node
//const _WebSocket = require('isomorphic-ws'); //node and browser, but not compatible code at the end

function wsp(client:WebSocket,methodname:string, args:any) {
    client.send(JSON.stringify({
        type: "jsonwsp/request",
        version: "1.0",
        servicename: "ogmios",
        methodname,
        args
    }));
}

function OgmiosErrList2Obj(errList:Array<any>):any{
    let allCodes:Array<string>=[];
    let numErrors:number=0;
    errList.forEach(entry=>{
        const codes= Object.keys(entry)
        allCodes=[...allCodes,...codes]
        numErrors+=codes.length;
    })
    return{
        errMessage:`Failed with ${numErrors>1?`${numErrors} errors`:"error"}: ${allCodes.join(", ")}`,
        message:JSON.stringify(errList,null,2),
        code:allCodes.join(",")
    }
}

const WS_ERR_NORMAL_CLOSURE=1000
const WS_ERR_TIMEOUT=1006
const wsErrCodes:{[key:string]:string}={
    "1000":"Normal Closure",
    "1001":"Going Away",
    "1002":"Protocol error",
    "1003":"Unsupported Data",
    "1004":"Reserved",
    "1005":"No Status Rcvd",
    "1006":"Abnormal Closure",
    "1007":"Invalid frame payload data",
    "1008":"Policy Violation",
    "1009":"Message Too Big",
    "1010":"Mandatory Ext.",
    "1011":"Internal Server Error",
    "1015":"TLS handshake",
}

export const startCardanoOgmiosClient=(url="wss://d.ogmios-api.testnet.dandelion.link",apiKey?:string,options?:any):Promise<WebSocket>=>{
    const {
        exitOnNotSynced,
        exitOnError
    }=options||{};
    const _128MB = 128 * 1024 * 1024
    let isTls=url.startsWith("wss://"); 
    let host=url.split('://')[1]
    let port=url.split(':')[2]?parseInt(url.split(':')[2]):(isTls?443:80);    
    const connection:Connection={
        host,
        port,
        tls: isTls,
        maxPayload: _128MB,//134217728,
        address: {
            webSocket:`${isTls?'wss':'ws'}://${host}:${port}`,
            http:`${isTls?'https':'http'}://${host}:${port}`
        }
    }
    //console.log({OGMIOS:connection})

    return new Promise(async (resolve,reject)=>{
        try{
            const health=await getServerHealth({connection});
            const{networkSynchronization}=health;
            if(networkSynchronization<0.99)
                console.warn(`Ogmios: node is out of sync (${(networkSynchronization*100).toFixed(1)} %)`)
            //console.log({health})
        }catch(err){
            reject (Error(`Ogmios error. ${err.message}`));
        }
        let client:WebSocket;
        try{
            client = new WebSocket(url); // format: "ws://localhost:1337"
        }catch(err){
            reject (Error(`Ogmios error. ${err.message}`));
        }
        const errorHandler = ( ev: Event):any =>{
            //console.log({ev})
            //throw Error(`Ogmios error. ${String(ev)}`);
            console.error(`Ogmios error. ${String(ev)}`);
        }
        const closeHandler = ( ev: CloseEvent):any =>{
            const {code,reason}=ev; //https://www.rfc-editor.org/rfc/rfc6455#section-11.7
            if(code===WS_ERR_NORMAL_CLOSURE ||
               code===WS_ERR_TIMEOUT)
                return;
            const codeMsg=wsErrCodes[String(code)] || ""
            //throw Error(`Ogmios error. WS connection closed. ${reason} (${code}:${codeMsg})`);
            console.error(`Close Handler: Ogmios error. WS connection closed. ${reason} (${code}:${codeMsg})`);
        }
        
        // initial ones:

        const initialErrorHandler = ( ev: Event):any =>{
            //console.log({ev})
            //const {message}=ev;
            //reject (Error(`Ogmios error. ${message}`));
        }
        const initialCloseHandler = ( ev: CloseEvent):any =>{
            //console.log({ev,client})
            const {code,reason}=ev; //https://www.rfc-editor.org/rfc/rfc6455#section-11.7
            if(code===WS_ERR_NORMAL_CLOSURE)
                return;
            const codeMsg=wsErrCodes[String(code)] || ""
            reject (Error(`Initial Close Handler: Ogmios error. WS connection closed. ${reason} (${code}:${codeMsg})`));
        }

        const removeInitialListeners = ()=>{
            client.removeEventListener("error",initialErrorHandler);
            client.removeEventListener("close",initialCloseHandler);
        }
        const openHandler = ( ev: Event):any =>{
            removeInitialListeners();
            client.addEventListener("error",errorHandler);
            client.addEventListener("close",closeHandler);
            //conn close will gracefully release this ones??
            console.info({src:'startCardanoOgmiosClient'},`Cardano Ogmios API: connected OK.`); 
            resolve(client);
        }
        const addInitialListeners = ()=>{
            client.addEventListener("error",initialErrorHandler);
            client.addEventListener("close",initialCloseHandler);
            client.addEventListener("open",openHandler);
        }
        addInitialListeners();
    })
}


/**
 * Similar to GraphQL submitTransaction function. Receives client (WebSocket) and the hexadecimal encoded signed transaction. 
 * Returns the hash of the tx.
 * 
 * @param client 
 * @param txHex 
 */
export const submitTransaction= async (client:WebSocket,txHex:string):Promise<any>=>{

    return new Promise((resolve,reject)=>{
        let txHash:string=""
        try{
            txHash=getTxHashFromTxHex(txHex);
            if(txHash.length<1)
                throw new Error("Invalid transaction format")
        }catch(err){
            return resolve({
                result:"",
                errMessage:`Cannot submit.${err?.message||"unknown error"}`,
                message:"",
                code:""
            })
        }
        //alert(txHash+" : "+txHex)

        client.addEventListener("message", function(ev:any) {
            const data=ev?.data || {};
            const response = JSON.parse(data);
            //console.log({response});
            const{
                methodname,
                result,
                fault,
            }=response||{};
            //methodname: "SubmitTx"
            if(result==="SubmitSuccess"){
                return resolve({
                    result:{hash:txHash}
                })
            }
            if(fault?.code){
                return resolve({
                    //result:"",
                    errMessage:fault?.string,
                    message:"",
                    code:fault?.code
                })
            }
            if(result?.SubmitFail){
                return resolve(OgmiosErrList2Obj(result.SubmitFail))
                // let errCode:string="unknown";
                // try{errCode=Object.keys(result?.SubmitFail[0])[0]}catch(err){}
                // return resolve({
                //     //result:"",
                //     errMessage:` ${errCode} error`,
                //     message:"",
                //     code:errCode
                // })
            }
            return resolve({
                //result:"",
                errMessage:`unknown error`,
                message:"",
                code:""
            })
            //client.close();

        });
        const bytes=arrayBufferToBase64(fromHex(txHex));
        wsp(client,"SubmitTx", { bytes });
    })
    
}

