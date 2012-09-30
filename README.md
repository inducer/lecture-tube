# LectureWeb

A JavaScript web player and a bunch of scripts and recipes to helps you post
lectures (with both room video and screen capture) to the web. Care for a demo?
Check out our [High-Performance Scientific Computing
class](http://wiki.tiker.net/Teaching/HPCFall2012), then click any of the
lecture videos (except the second one, where we had technical difficulties).

- Andreas Kloeckner <inform@itker.net>

(this is a work in progress, more to follow)

Requirements:

* A good webcam (see below)
* [guvcview](http://guvcview.sourceforge.net/) (camera recording)
* [gstreamer 1.0](http://gstreamer.org) (postprocessing)
* [ffmpeg](http://ffmpeg.org) (postprocessing)
* [audacity](http://audacity.sourceforge.net/) (noise removal)
* [mplayer](https://en.wikipedia.org/wiki/MPlayer) (glue videos together)

(In other words: yes, this uses most free/open-source video processing packages
available today. Suggestions on how to reduce this number are welcome, but on
the other hand, all of these are very easy to install in any Linux recent
distribution.)

## Source material

### Room adudio/video

Record room video and audio using a [Logitech HD Pro
C910](http://www.amazon.com/Logitech-HD-Pro-Webcam-C910/dp/B003M2YT96)  (or
equivalent). In any case, make sure to get a decent-quality
[UVC](https://en.wikipedia.org/wiki/USB_video_device_class) camera capable of
1920p.

I use guvcview on Linux for lecture recording to capture AVI encapsulated MJPEG
(video) and MP3 (audio). Careful: don't use the MKV/Matroska container format
in guvcview--it becomes unusable after a crash. (v1.5.3, 9/24/2012) At 1920p,
you will get about 20GB of data for a two-hour lecture.

guvcview lets you can manipulate exposure and focus as you're recording. It
generally has tons of settings, and it can display a VU meter so you can verify
that audio is being recorded.

An alternative on Macs is [this Logitech
program](http://www.logitech.com/en-us/435/6816?section=downloads&bit=&osid=9),
but this has failed us in various ways (bad audio, truncated video).

### Capturing the screen

Use the command line

    ./capture-screen output-file.webm

to capture video of the screen. Note that this assumes a Linux OS and a
resolution of 1024x768. Change that in the script if your resolution is
different. (This script just calls FFMpeg with the right options--and it
protects you from overwriting existing files.)

Not on Linux? [VLC](http://www.wikihow.com/Screen-Capture-to-File-Using-VLC)
can do screen capture on any platform.

This [Wikipedia
page](https://en.wikipedia.org/wiki/Comparison_of_screencasting_software) has
an overview of other software alternatives.

### Capturing slide numbers

Use

    ./log-okular-pages > slide-log.txt

to log time-coded page numbers in the
[Okular](https://en.wikipedia.org/wiki/Okular) PDF viewer.

Not on Linux or don't have Okular? All you need to do is write a seconds-based
timestamp and the current PDF slide number to a file. Scripts/patches for other
PDF readers/presentation programs welcome.

## Posptrocessing

### Postprocessing the room video

guvcview partitions its output into lots of 2G-sized videos, likely to avoid
some restriction on file size. This command glues the videos back together:

    mencoder -oac copy -ovc copy -o dest.avi capture-{1,2,3}.avi

GStreamer 1.0 doesn't like the resulting AVI file very much, so we use ffmpeg
to convert to an MKV container format:

    ffmpeg -i dest.avi -acodec copy -vcodec copy dest.mkv

You can tell that this is a better-behaved file because all of a sudden you can
seek in it in a video player.

Next, use

    ./extract-audio dest.mkv

to write the audio to a separate file `audio.wav`. Open this in Audacity,
select a bit of background noise (it'll be there, trust me). Click "Effect >
Noise Removal", then "Get Noise Profile". Next, select the entire file
(Ctrl+A), and click "Effect > Noise Removal" again, and just accept with "Ok".
Using "File > Export", simply save over the existing `audio.wav`.

Lastly, use

    ./process-room-video-guvcview-avi dest.mkv

Make sure that the noise-filtered audio.wav is in the current directory. This produces
`room.webm`, which is your final room video.

### Postprocessing the screencap

The screen capture gets recorded in streaming mode. This is good because that
means the file is usable even if your machine crashes. It's bad because the
resulting file is not seekable. This command fixes that:

    ffmpeg -i screencap.webm -vcodec copy processed-screencap.webm

If the audio is broken, simply add `-an`. The resulting file is your final
screen capture.

## Writing the lecture info file

(documentation to follow, just check out `upload/metadata/example.json` for now)

### Processing the slide log

### Getting a parse error?

Paste your JSON file into [this validator](http://jsonlint.com/). It'll tell
you what you need to fix.
