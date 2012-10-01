# LectureWeb

A JavaScript web player and a bunch of scripts and recipes to helps you post
lecture videos (with synchronized room video and screen capture) to the web.

[Demo](http://www.cims.nyu.edu/~kloeckner/hpc12-video/upload/html/player.html?descriptor=metadata/2012-09-05.json)

Browser support:
* Chrome
* Firefox (broken at the moment, [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=795686))

Unsupported:
* Safari (doesn't support [WebM](https://en.wikipedia.org/wiki/WebM))
* Internet Explorer (doesn't support WebM either)

Support could conceivably be broadened to browsers not supporting WebM
by also storing MPEG4-encoded videos. The player would require some
modifications in this case.

Note that all of this is a work in progress. We're currently learning our
way.

Andreas Kloeckner <inform@itker.net>


Requirements:

* A good webcam (see below)
* [guvcview](http://guvcview.sourceforge.net/) (camera recording)
* [gstreamer 1.0](http://gstreamer.org) (postprocessing)
* [ffmpeg](http://ffmpeg.org) (postprocessing)
* [audacity](http://audacity.sourceforge.net/) (noise removal)

(We may be able to get rid of gstreamer as a dependency at some point.)

## Source material

### Room audio/video

We record room video and audio using a [Logitech HD Pro
C910](http://www.amazon.com/Logitech-HD-Pro-Webcam-C910/dp/B003M2YT96). I paid
about $60 for this when it was on sale at some point. The exact model is
perhaps not so important, but
[UVC](https://en.wikipedia.org/wiki/USB_video_device_class) cameras are
generally easier to deal with than non-UVC webcams. In addition, that model
(and its successors) can record in
[1080p](https://en.wikipedia.org/wiki/1080p).

I use guvcview on Linux to capture room video. I recommend the MKV
("Matroska") video container format.  These considerations enter into this
choice:

* It supports files of arbitrary size. AVI (the other choice in guvcview)
  does not, and thus you get lots of little files that are fun to glue back
  together.

* AVI only supports a frame rate, not an absolute presentation timestamp
  (unlike Matroska). That means your video is subject to fun clock drift.

* Unlike AVI, the MKV support in guvcview is not crash-proof. If guvcview
  dies/crashes (it hasn't yet for me), it will take your video with it.

See below (under "recovering from accidents") if you've already got AVI source
material.

Further settings in guvcview are important:

* Make sure to choose your frame rate and audio sample rate so that one is
  an integer multiple of the other. Otherwise you may get clock drift
  that's a pain to recover from if you want to synchronize with the screen
  capture. (Again, see 'recovering from accidents' below.)

* Use MJPEG as the video format. That's what comes out of the camera.
  (Actually, there's a setting for that, too. Make sure that's what it's set
  to.) If you're capturing in 1080p (you should), even my somewhat beefy Sandy
  Bridge laptop can't transcode to anything in real time, not even lowly MPEG2.

* Audio format doesn't really matter. You might as well save some space and
  use MP3. (Your audio is pretty poor anyhow, unless you're using a fancy
  mic.)

At 1080p, you will get about 20GB of data for a two-hour lecture.

guvcview lets you can manipulate exposure and focus as you're recording. It
generally has tons of settings, and it can display a VU meter so you can verify
that plausible audio is being recorded.

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

#### Audio for the screen capture

I bought a cheapo [Lavalier
mic](https://en.wikipedia.org/wiki/Lavalier_microphone) ("JH3308") off ebay
(~$20) that I connect to the audio-in of my laptop. This works very well,
despite the plasticky appearance of the mic's transmitter and receiver.

*Slight stumbling block:* My laptop only has a combined
3.5mm [TRRS](https://en.wikipedia.org/wiki/TRRS) headphone/microphone jack. To make
this work with the 1/4-inch TRS plug of the mic, I bought a 3.5mm TRRS plug
(male) and a 1/4-inch TRS jack (female) on Ebay. A half-hour soldering session
later, everything was ready to go.

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

Next, use

    ./extract-audio capture-N.mkv

to write the audio to a separate file `audio.wav`. Open this in Audacity,
select a bit of background noise (it'll be there, trust me). Click "Effect >
Noise Removal", then "Get Noise Profile". Next, select the entire file
(Ctrl+A), and click "Effect > Noise Removal" again, and just accept with "Ok".
Using "File > Export", simply save over the existing `audio.wav`.

Lastly, use

    ./merge-audio-and-encode-room-video capture-N.mkv

Make sure that the noise-filtered audio.wav is in the current directory. This produces
`room.webm`, which is your final room video.

### Postprocessing the screencap

The screen capture gets recorded in streaming mode. This is good because that
means the file is usable even if your machine crashes. It's bad because the
resulting file is not seekable. This command fixes that:

    ffmpeg -i screencap.webm -vcodec copy processed-screencap.webm

If the audio is broken (it happens), simply add `-an`. The resulting file is
your final screen capture.

## Writing the lecture info file

(documentation to follow, just check out `upload/metadata/example.json` for now)

### Processing the slide log

### Getting a parse error?

Paste your JSON file into [this validator](http://jsonlint.com/). It'll tell
you what you need to fix.

## Recovering from accidents

### I recorded with an audio rate that is not an integer multiple of my frame rate

Some part of your video processing pipeline will drop frames on you, and
audio/video sync will be ever so slightly off. If you recorded with a
non-absolute format, too (accidents come in pairs, at least for me), then
your video will accumulate clock drift (perhaps 20 seconds in two hours),
and you won't be synchronized with your screen capture.

This command can help you recover:

    ffmpeg -i video/2012-09-26-room.webm -filter setpts=1.0038487282463187*PTS new-speed.webm

PTS stands for 'presentation timestamp' and is an absolute time. You'll
probably have to adjust the factor.

### I recorded my guvcview video in AVI

Welcome to a world of hurt. First, guvcview starts a new AVI file every
1.9GB, so you need to glue those files back together.  This command does that:

    mencoder -oac copy -ovc copy -o dest.avi capture-{1,2,3}.avi

GStreamer 1.0 doesn't like the resulting AVI file very much, so we use ffmpeg
to convert to an MKV container format:

    ffmpeg -i dest.avi -acodec copy -vcodec copy dest.mkv

You can tell that this is a better-behaved file because all of a sudden you can
seek in it in a video player. If you've made the mistake of mismatch frame
rate and audio rate, you'll see "duplicating/dropping frame" messages
warning you of fun up ahead.

Next, AVI is a format without absolute timestamps, so you may also need the
previous answer.
