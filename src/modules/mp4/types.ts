export interface MetaDataMp4 {
  ftyp?: BoxFTYP
  moov?: BoxMOOV
  // computed attrs
  fileSize?: number
  duration?: number
}

export interface Box {
  size: number
  type: string
}

export interface BoxFTYP extends Box {
  majorBrand: string
  minorVersion: number
  compatibleBrands: string[]
}

export interface BoxMOOV extends Box {
  mvhd?: BoxMVHD
  tracks: BoxTrack[]
}

export interface BoxMVHD extends Box {
  version: 0 | 1
  creationTime: number
  modificationTime: number
  timeScale: number
  duration: number
  rate: number
  volume: number
  nextTrackId: number
}

export interface BoxTrack extends Box {
  tkhd?: BoxTKHD
}
export interface BoxTKHD extends Box {
  version: 0 | 1
  flag: number
  creationTime: number
  modificationTime: number
  trackId: number
  duration: number
  layer: number
  alternateGroup: number
  volume: number
  width: number
  height: number
}
