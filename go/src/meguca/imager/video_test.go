package imager

import (
	"meguca/common"
	"meguca/imager/assets"
	"testing"
)

func TestProcessWebm(t *testing.T) {
	t.Parallel()

	cases := [...]struct {
		testName, name string
		audio          bool
		length         uint32
		dims           [4]uint16
	}{
		{
			"without sound",
			"wafel.webm", false, 5, [4]uint16{0x500, 0x2d0, 0x96, 0x54},
		},
		{
			"with sound",
			"sample.webm", true, 1, [4]uint16{0x500, 0x2d0, 0x96, 0x54},
		},
	}

	for i := range cases {
		c := cases[i]
		t.Run(c.testName, func(t *testing.T) {
			t.Parallel()

			thumb, img, err := processFile(
				readSample(t, c.name),
				common.ImageCommon{},
				dummyOpts,
			)
			if err != nil {
				t.Fatal(err)
			}

			assertThumbnail(t, thumb)
			assertDims(t, img.Dims, c.dims)
			assertAudio(t, img.Audio, c.audio)
			assertLength(t, img.Length, c.length)
		})
	}
}

func assertAudio(t *testing.T, res, std bool) {
	if res != std {
		t.Error("unexpected audio flag value")
	}
}

func TestProcessOGG(t *testing.T) {
	t.Parallel()

	cases := [...]struct {
		name, file   string
		err          error
		audio, video bool
		length       uint32
		dims         [4]uint16
	}{
		{
			name:   "vorbis+theora",
			file:   "sample",
			audio:  true,
			video:  true,
			length: 5,
			dims:   [4]uint16{0x230, 0x140, 0x96, 0x55},
		},
		{
			name:   "opus+theora",
			file:   "opus_theora",
			audio:  true,
			video:  true,
			length: 5,
			dims:   [4]uint16{0x230, 0x140, 0x96, 0x55},
		},
		{
			name:   "theora",
			file:   "no_audio",
			length: 5,
			dims:   [4]uint16{0x230, 0x140, 0x96, 0x55},
		},
		{
			name:   "vorbis",
			file:   "no_video",
			audio:  true,
			length: 5,
			dims:   [4]uint16{150, 150, 150, 150},
		},
		{
			name:   "opus",
			file:   "opus",
			audio:  true,
			length: 5,
			dims:   [4]uint16{150, 150, 150, 150},
		},
		{
			name:   "with cover art",
			file:   "with_cover",
			audio:  true,
			length: 5,
			dims:   assets.StdJPEG.Dims,
		},
	}

	for i := range cases {
		c := cases[i]
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			thumb, img, err := processFile(
				readSample(t, c.file+".ogg"),
				common.ImageCommon{},
				dummyOpts,
			)
			if err != c.err {
				t.Fatal(err)
			}
			if c.err != nil {
				return
			}

			assertThumbnail(t, thumb)
			assertDims(t, img.Dims, c.dims)
			assertAudio(t, img.Audio, c.audio)
			assertLength(t, img.Length, c.length)
		})
	}
}

func TestProcessMP4(t *testing.T) {
	t.Parallel()

	cases := [...]struct {
		name, file   string
		err          error
		audio, video bool
		length       uint32
		dims         [4]uint16
	}{
		{
			name:   "aac+h264",
			file:   "sample",
			audio:  true,
			video:  true,
			length: 13,
			dims:   [4]uint16{0x500, 0x2d0, 0x96, 0x54},
		},
		{
			name:   "mp3+h264",
			file:   "mp3_h264",
			audio:  true,
			video:  true,
			length: 13,
			dims:   [4]uint16{0x500, 0x2d0, 0x96, 0x54},
		},
		{
			name:   "aac",
			file:   "aac",
			audio:  true,
			length: 13,
			dims:   [4]uint16{150, 150, 150, 150},
		},
		{
			name:   "mp3",
			file:   "mp3",
			audio:  true,
			length: 13,
			dims:   [4]uint16{150, 150, 150, 150},
		},
		{
			name:   "h264",
			file:   "h264",
			length: 13,
			dims:   [4]uint16{0x500, 0x2d0, 0x96, 0x54},
		},
		{
			name:   "with cover art",
			file:   "with_cover",
			audio:  true,
			length: 13,
			dims:   assets.StdJPEG.Dims,
		},
	}

	for i := range cases {
		c := cases[i]
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			thumb, img, err := processFile(
				readSample(t, c.file+".mp4"),
				common.ImageCommon{},
				dummyOpts,
			)
			if err != c.err {
				t.Fatal(err)
			}
			if c.err != nil {
				return
			}

			assertThumbnail(t, thumb)
			assertDims(t, img.Dims, c.dims)
			assertAudio(t, img.Audio, c.audio)
			assertLength(t, img.Length, c.length)
		})
	}
}
