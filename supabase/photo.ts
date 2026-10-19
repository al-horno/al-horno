export const PHOTO_BUCKET='al-horno-product-photos';
export const PHOTO_LIMIT=2*1024*1024;
export function decodePhoto(value:unknown){
 const fail=()=>{throw Object.assign(new Error('Elige una foto JPG, PNG o WebP de hasta 2 MB.'),{status:400})};
 if(typeof value!=='string'||value.length>Math.ceil(PHOTO_LIMIT/3)*4+40)fail();
 const match=(value as string).match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match)fail();
 let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(match![2]),c=>c.charCodeAt(0))}catch{fail()}
 if(bytes!.length<12||bytes!.length>PHOTO_LIMIT)fail();
 const b=bytes!;
 const valid=match![1]==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:
 match![1]==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v):
 String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 if(!valid)fail();
 return {bytes:b,mime:match![1],extension:match![1]==='image/jpeg'?'jpg':match![1].slice(6)};
}
