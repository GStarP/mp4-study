import { resolve } from 'path'
import { probe_mp4 } from './modules/mp4/probe'
import { writeFileSync } from 'fs'

function main() {
  const metadata = probe_mp4(resolve(__dirname, '../assets/rabbit320.mp4'))
  writeFileSync(resolve(__dirname, './result.json'), JSON.stringify(metadata))
}

main()
