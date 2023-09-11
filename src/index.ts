import { resolve } from 'path'
import { probe_mp4 } from './modules/mp4/probe'

function main() {
  const metadata = probe_mp4(resolve(__dirname, '../assets/rabbit320.mp4'))
  console.log(metadata)
  console.log(metadata.moov?.tracks)
}

main()
