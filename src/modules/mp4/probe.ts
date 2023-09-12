import fs from 'fs'
import {
  Box,
  BoxFTYP,
  BoxMOOV,
  BoxMVHD,
  BoxTKHD,
  MetaDataMp4,
  BoxTrack,
  BoxMDIA,
  BoxHDLR,
  BoxMINF,
  BoxSTBL,
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
  let isVideo = false

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

    const movEndPos = pos + (box.size - 8) - box.mvhd.size
    while (pos < movEndPos) {
      box.tracks.push(read_next_box('trak'))
    }
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

  function read_next_box(targetType: string): any {
    if (pos >= fileSize) {
      throw new Error(`[read_next_box] EOF`)
    }

    const box = read_box_size_and_type()
    if (box.type !== targetType) {
      // size and type already take 8 bytes
      pos += box.size - 8
      return read_next_box(targetType)
    } else {
      if (targetType === 'trak') {
        return read_next_box_track(box)
      } else if (targetType === 'mdia') {
        return read_next_box_mdia(box)
      } else if (targetType === 'hdlr') {
        return read_next_box_hdlr(box)
      } else if (targetType === 'minf') {
        return read_next_box_minf(box)
      } else if (targetType === 'stbl') {
        return read_next_box_stbl(box)
      }
      return box
    }
  }

  function read_next_box_track(sat: Box): BoxTrack {
    const track: BoxTrack = {
      ...sat,
    }
    const posAfterTrack = pos + sat.size - 8

    track.tkhd = read_box_tkhd()
    track.mdia = read_next_box('mdia')

    pos = posAfterTrack

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

  function read_next_box_mdia(sat: Box): BoxMDIA {
    const box: BoxMDIA = { ...sat }

    box.hdlr = read_next_box('hdlr')
    box.minf = read_next_box('minf')

    return box
  }

  function read_next_box_hdlr(sat: Box): BoxHDLR {
    const box: BoxHDLR = {
      ...sat,
      version: 0,
      handlerType: '',
      name: '',
    }

    // version
    const version = read_int(1)
    if (version !== 0 && version !== 1) {
      throw new Error(`invalid version: ${version}`)
    } else if (version === 1) {
      throw new Error('version 1 not supported')
    }
    // flags
    pos += 3
    // pre defined
    pos += 4
    // handler type
    box.handlerType = read_str()
    // @FIX
    // set global isVideo to let other read_box funcs
    // know we are parsing video info now
    if (box.handlerType === 'vide') isVideo = true
    else isVideo = false
    // reserved
    pos += 12
    // name
    box.name = read_long_str(box.size - 32)

    return box
  }

  function read_next_box_minf(sat: Box): BoxMINF {
    const box: BoxMINF = {
      ...sat,
    }

    box.stbl = read_next_box('stbl')

    return box
  }

  function read_next_box_stbl(sat: Box): BoxSTBL {
    const box: BoxSTBL = {
      ...sat,
    }

    if (isVideo) {
      /**
       * stsd
       */
      box.stsd = read_box_size_and_type()
      // version
      box.stsd.version = read_int(1)
      // flags
      pos += 3
      // number of entries
      box.stsd.entryNum = read_int()
      // entries
      box.stsd.entries = []
      for (let i = 0; i < box.stsd.entryNum; i++) {
        const entry: any = {}
        // size
        entry.size = read_int()
        // format
        entry.format = read_str()
        if (entry.format !== 'avc1') {
          throw new Error('only know avc1')
        }
        // reserved
        pos += 6
        // data reference index
        entry.dataRefIndex = read_int(2)
        // version
        entry.version = read_int(2)
        // revision level
        entry.revisionLevel = read_int(2)
        // vendor
        entry.vendor = read_int()
        // temporal quality
        entry.temporalQuality = read_int()
        // spatial quality
        entry.spatialQuality = read_int()
        // width
        entry.width = read_int(2)
        // height
        entry.height = read_int(2)
        // horizontal resolution
        entry.resolutionHor = read_int(2) + toDecimal(read_int(2))
        // vertical resolution
        entry.resolutionVer = read_int(2) + toDecimal(read_int(2))
        // data size
        entry.dataSize = read_int()
        // frame count
        entry.frameCount = read_int(2)
        // compressor name
        entry.compressorName = read_int()
        // @FIX unknown 28 bytes
        pos += 28
        // depth
        entry.depth = read_int(2)
        // pre defined
        pos += 2
        /**
         * avc config
         */
        const config: any = {}
        entry.config = config
        // size
        config.size = read_int()
        const posAfterAvcConfig = pos + config.size - 4
        // type
        config.type = read_str()
        // version
        config.version = read_int(1)
        // profile
        // 66 => Baseline
        config.profile = read_int(1)
        // profile compatibility
        pos += 1
        // level
        config.level = read_int(1)
        // skip all after
        pos = posAfterAvcConfig

        box.stsd.entries.push(entry)
      }
    } else {
      // skip audio stbl
      pos += sat.size - 8
    }

    return box
  }

  /**
   * Utils
   */
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
  function read_long_str(len: number): string {
    let tmpBuffer: Buffer | null = Buffer.alloc(len)
    fs.readSync(fd, tmpBuffer, 0, len, pos)
    pos += len
    const str = tmpBuffer.toString('utf-8')
    tmpBuffer = null
    return str
  }

  metadata.ftyp = read_box_ftyp()
  metadata.moov = read_box_moov()

  // compute extra attrs
  metadata.duration = metadata.moov.mvhd
    ? metadata.moov.mvhd?.duration / metadata.moov.mvhd?.timeScale
    : NaN

  return metadata
}
