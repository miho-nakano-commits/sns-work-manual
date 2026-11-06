import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Home from '../app/page.tsx';
import Setup from '../app/media-setup/page.tsx';
import {env,cookieValues} from './runtime-mock.mjs';
test('published manual still renders its login loading screen',()=>assert.match(renderToStaticMarkup(React.createElement(Home)),/読み込んでいます/));
test('preparation UI is unavailable without an administrator session',async()=>{
 try{
  assert.match(renderToStaticMarkup(await Setup()),/管理者ログインが必要/);
  env.DB={prepare(){return{bind(){return{async first(){return{id:'fixture',role:'user'};}};}};}};
  cookieValues.set('sns_manual_session','synthetic-token');
  assert.match(renderToStaticMarkup(await Setup()),/管理者ログインが必要/);
 }finally{delete env.DB;cookieValues.clear();}
});
