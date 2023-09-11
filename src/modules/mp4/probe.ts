import fs from 'fs'
import {
  Box,
  BoxFTYP,
  BoxMOOV,
  BoxMVHD,
  BoxTKHD,
  MetaDataMp4,
  BoxTrack,
} from './types'
import { toDecimal } from '../common/math'

/**
 * @param filepath path of the `.mp4` file
 * @returns mp4 metadata
 */
export function probe_mp4(filepath: string): MetaDataMp4 {
  const metadata: MetaDataMp4 = {}

  const fileSize = fs.statSync(filepath).size
  metadata.fileSize = fileSize

  const fd = fs.openSync(filepath, 'r')
  let pos = 0
  const buffer = Buffer.alloc(4)

  function read_box_ftyp(): BoxFTYP {
    const box: BoxFTYP = {
      size: 0,
      type: '',
      majorBrand: '',
      minorVersion: 0,
      compatibleBrands: [],
    }

    const { size, type } = read_box_size_and_type()
    box.size = size
    box.type = type

    // major brand
    box.majorBrand = read_str()
    // minor version
    box.minorVersion = read_int()
    // compatible brands
    while (pos < box.size) {
      box.compatibleBrands.push(read_str())
    }

    return box
  }

  function read_box_moov(): BoxMOOV {
    const box: BoxMOOV = {
      size: 0,
      type: '',
      tracks: [],
    }

    const { size, type } = read_box_size_and_type()
    box.size = size
    box.type = type

    box.mvhd = read_box_mvhd()
    // @DEV
    // while (pos < fileSize) {
    box.tracks.push(read_box_track())
    // }
    return box
  }

  function read_box_mvhd(): BoxMVHD {
    const box: BoxMVHD = {
      size: 0,
      type: '',
      version: 0,
      creationTime: 0,
      modificationTime: 0,
      timeScale: 0,
      duration: 0,
      rate: 0,
      volume: 0,
      nextTrackId: 0,
    }

    const { size, type } = read_box_size_and_type()
    box.size = size
    box.type = type

    // version
    const version = read_int(1)
    if (version !== 0 && version !== 1) {
      throw new Error(`invalid version: ${version}`)
    } else if (version === 1) {
      throw new Error('version 1 not supported')
    }
    // flags
    pos += 3
    // creation time
    box.creationTime = read_int()
    // modification time
    box.modificationTime = read_int()
    // time scale
    box.timeScale = read_int()
    // duration
    box.duration = read_int()
    // rate
    box.rate = read_int(2) + toDecimal(read_int(2))
    //volume
    box.volume = read_int(1) + toDecimal(read_int(1))
    // reserved
    pos += 10
    //matrix
    pos += 36
    // pre defined
    pos += 24
    box.nextTrackId = read_int()

    return box
  }

  function read_box_track(): BoxTrack {
    const track: BoxTrack = {
      size: 0,
      type: '',
    }

    const { size, type } = read_box_size_and_type()
    track.size = size
    track.type = type

    track.tkhd = read_box_tkhd()

    return track
  }

  function read_box_tkhd(): BoxTKHD {
    const box: BoxTKHD = {
      size: 0,
      type: '',
      version: 0,
      flag: 0,
      creationTime: 0,
      modificationTime: 0,
      trackId: 0,
      duration: 0,
      layer: 0,
      alternateGroup: 0,
      volume: 0,
      width: 0,
      height: 0,
    }

    const { size, type } = read_box_size_and_type()
    box.size = size
    box.type = type

    // version
    const version = read_int(1)
    if (version !== 0 && version !== 1) {
      throw new Error(`invalid version: ${version}`)
    } else if (version === 1) {
      throw new Error('version 1 not supported')
    }
    // flags
    box.flag = read_int(3)
    // creation time
    box.creationTime = read_int()
    // modification time
    box.modificationTime = read_int()
    // track id
    box.trackId = read_int()
    // reserved
    pos += 4
    // duration
    box.duration = read_int()
    // reserved
    pos += 8
    // layer
    box.layer = read_int(2)
    // alternate group
    box.alternateGroup = read_int(2)
    // volume
    box.volume = read_int(1) + toDecimal(read_int(1))
    // reserved
    pos += 2
    // matrix
    pos += 36
    // width
    box.width = read_int(2) + toDecimal(read_int(2))
    // height
    box.height = read_int(2) + toDecimal(read_int(2))

    return box
  }

  function read_str(): string {
    fs.readSync(fd, buffer, 0, 4, pos)
    pos += 4
    return buffer.toString('utf-8')
  }
  function read_int(byteLength: number = 4): number {
    fs.readSync(fd, buffer, 0, byteLength, pos)
    pos += byteLength
    return buffer.readUintBE(0, byteLength)
  }
  function read_box_size_and_type(): Box {
    // box size
    const size = read_int()
    // type
    const type = read_str()

    return { size, type }
  }

  metadata.ftyp = read_box_ftyp()
  metadata.moov = read_box_moov()

  // compute extra attrs
  metadata.duration = metadata.moov.mvhd
    ? metadata.moov.mvhd?.duration / metadata.moov.mvhd?.timeScale
    : NaN

  return metadata
}
