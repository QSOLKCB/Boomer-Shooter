import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const base=new URL('../vendor/vanillajs/',import.meta.url);
const bytes=p=>readFileSync(new URL(p,base));
const hash=buf=>createHash('sha256').update(buf).digest('hex');
test('every upstream byte and transitive import is receipted; consumer derivative is reproducible',()=>{
  const manifest=JSON.parse(bytes('manifest.json'));
  const closure=new Set(), visit=p=>{
    if(closure.has(p))return;closure.add(p);
    for(const m of bytes(p).toString().matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
      assert(m[1].startsWith('.'));visit(path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1])));
    }
  };
  for(const root of manifest.roots)visit('modules/'+root+'/index.js');
  assert.deepEqual([...closure].sort(),Object.keys(manifest.files).filter(p=>p.endsWith('.js')).sort());
  assert.deepEqual(readdirSync(new URL('modules/',base)).sort(),manifest.modules);
  for(const [p,sha] of Object.entries(manifest.files)) assert.equal(hash(bytes(p)),sha,p);
  const derived=bytes('../../src/engine/combat3d.js').toString(), method=bytes('../../integration/armour-method.txt').toString();
  assert.equal(derived,bytes('modules/combat3d/index.js').toString().replaceAll("from '../","from '../../vendor/vanillajs/modules/").replace('  #emit(e){',method+'  #emit(e){'));
  // The owner approved this exact derivative at v3.2.0 on game PR #2.
  const approved='7208d9722b04418a06951c653960b7a9c9c10df6bf305f7d2c6643332d895223';
  assert.equal(manifest.commit,'7a3a5a3ec49aed5b7063a05614951e69bb257da6');
  assert.deepEqual(manifest.localChanges,[]);
  assert.deepEqual(manifest.derivatives,{'src/engine/combat3d.js':{
    source:'modules/combat3d/index.js',extension:'integration/armour-method.txt',sha256:approved
  }});
  assert.equal(hash(derived),approved);
  assert(bytes('../../src/boot.js').toString().includes(hash(bytes('manifest.json'))));
});
