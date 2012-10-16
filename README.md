# LectureTube

## What is this?

Lecture Tube consists of:

* A JavaScript web player (see `upload/html/`) 
* a bunch of scripts and (manual) recipes 

to help you

* record,
* post-process, and
* post

(not just) lecture videos to the web. These lecture videos consist of

* a screencast and 
* lecture hall video, plus 
* two user-selectable audio streams.

The player arranges for synchronized playback of these streams and allows some
minimal non-linear editing.

[Demo](http://www.cs.nyu.edu/courses/fall12/CSCI-GA.2945-001/video/upload/html/player.html?descriptor=metadata/2012-09-05.json)

LectureTube was written for my [High-Performance Computing
class](http://wiki.tiker.net/Teaching/HPCFall2012) at NYU.  The class web page
contains links to a lecture's worth of videos. The motivation for writing it
was that the class contains many live demonstrations in code and use of
machines that would not be adequately captured if we relied on just slides or
notes.

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

## Related guides and projects

* [OpenCast Matterhorn (U Osnabrück/ETH Zürich](http://opencast.org/matterhorn/)
  (aims at large-scale, organization-wide use)
* [Erik Demaine's guide (MIT)](http://erikdemaine.org/classes/recording/)
  (about $4000 in equipment cost, plus a live camera operator)
* this guide (about $100 in equipment cost, unattended recording)

## Requirements

* A good webcam (see below)
* [gstreamer 0.10](http://gstreamer.org) (postprocessing)
* [gstreamer 1.0](http://gstreamer.org) (capture, postprocessing)
* [ffmpeg](http://ffmpeg.org) (postprocessing)
* [audacity](http://audacity.sourceforge.net/) (noise removal)
* [pulseaudio](http://pulseaudio.org/) (audio routing during capture)
* [guvcview](http://guvcview.sourceforge.net/)
  (optional, provides focus/exposure controls during capture)

(For now, you need both gstreamer versions, because of a bug.)

Nice to have:

* A tripod to hold up the camera (and a strip of velcro, because most 
  webcams don't have tripod mounting holes)
* A lavalier microphone to capture decent-quality speaker audio

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

We attach the webcam to the top of a (cheapo) tripod using a looped strip of
velcro.

Our current approach to capturing what's going on in the classroom is to use
gstreamer. I've packaged this up in a script:

    ./capture-room room-2012-10-3.mkv

I recommend the MKV ("[Matroska](https://en.wikipedia.org/wiki/Matroska)")
video container format.  These considerations enter into this choice:

* It supports files of arbitrary size. AVI (a common, but dangerous choice!)
  does not, and thus you get lots of little files that are fun to glue back
  together.

* AVI only supports a frame rate, not an absolute presentation timestamp
  (unlike Matroska). That means your video is subject to fun clock drift.

* "Streamable" MKV is crash-proof. Even if the machine dies, the video
  up to that point will be usable.

See below (under "recovering from accidents") if you've already got AVI or
other source material.

If you're rigging your own recording, here are some lessons I've learned:

* Make sure to choose your frame rate and audio sample rate so that one is
  an integer multiple of the other. Otherwise you may get clock drift
  that's a pain to recover from if you want to synchronize with the screen
  capture. (Again, see 'recovering from accidents' below.)

  For reference, I use a frame rate of 15fps, which is good enough for
  lecture footage.

* Use MJPEG as the video format. That's what comes out of the camera.  If
  you're capturing in 1080p (you should), even my somewhat beefy Sandy Bridge
  laptop can't transcode to anything in real time, not even lowly MPEG2.

* Audio format doesn't really matter. You might as well save some space and use
  MP3. Your room audio is going to be pretty poor anyhow, unless you're using
  a fancy mic. Noise filtering (as described below) helps.

At 1080p, you will get about 20GB of data for a two-hour lecture.

guvcview can be run in controls-only mode and lets you can manipulate exposure
and focus as you're recording.

An alternative on Macs is [this Logitech
program](http://www.logitech.com/en-us/435/6816?section=downloads&bit=&osid=9),
but this has failed us in various ways (bad audio, truncated video).

guvcview (link above) looked promising as a full capture solution, but v1.6.0
and earlier gave us terrible trouble when trying to maintain reasonable sync
through ~2h of video.  The author assured me that v1.6.1 fixes this, but I
haven't verified that claim.

### Capturing screen and speaker audio

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

Not on Linux or don't have Okular? All you need to do is write a line to a
file every second or so containing

    TIMESTAMP SLIDE_NUMBER

The timestamp is seconds-based and allowed to contain a decimal point.
Scripts/patches for other PDF readers/presentation programs welcome.

## Posptrocessing

### Postprocessing the room video

Use

    ./extract-audio capture-N.mkv

to write the audio to a separate file `audio.wav` (gets created in the current
directory). Open this in Audacity, select a bit of background noise (it'll be
there, trust me). Click "Effect > Noise Removal", then "Get Noise Profile".
Next, select the entire file (Ctrl+A), and click "Effect > Noise Removal"
again, and just accept with "Ok".  Using "File > Export", simply save over the
existing `audio.wav`.

Lastly, use

    ./merge-audio-and-encode-room-video capture-N.mkv

Make sure that the noise-filtered audio.wav is in the current directory. This produces
`room.webm`, which is your final room video.

### Postprocessing the screencap

The screen capture gets recorded in streaming mode. This is good because that
means the file is usable even if your machine crashes. It's bad because the
resulting file is not seekable. This command fixes that:

    ffmpeg -i screencap.webm -codec copy processed-screencap.webm

If the audio is broken (it happens), simply add `-an`. The resulting file is
your final screen capture.

## Writing the lecture info file

Make a copy of `upload/metadata/example.json` and open that in a text editor.
This is a [JSON file](https://en.wikipedia.org/wiki/JSON), which has a specific
syntax. 

Add all your media files as parts of the `"media"` array, giving each of them a
unique `"id"` field.  Using the `"target"` property you can set where the video
is going to play. (By default, there are `"left-video"` and `"right-video"`.
But if you modify `"upload/html/player.html"`, you could conceivably add
more/different targets.  (Targets are HTML5 `video` or `audio` elements.)
The `"src"` entries are relative to where you keep `"player.html"`.

In many places of the file, you'll see time specifications of the form

    ["room", [1, 20, 20]]

This means, "at the 1:20:20 mark of the video with id `"room"`". You may leave
out the 'hours' field if it's not needed.

LectureTube automatically builds a global timeline of all media. To enable it
to do that, you need to tell it where to synchronize your media file with some
preceding one, in the `"sync"` property of a `"media"` element. Just find one
point in both videos (a slide change or some such), and record the time in the
video to by synced in `"my_time"`, and the time in the video you're syncing to
in `"target_time"`, in the time specification format described above. Note that
here you may only refer to media that are textually before the one being
synced.

To add slide numbers, run the slide page log through this script:

    ./process-slide-numbers pagelog-10-03.txt

It will produce JSON ouptut that you can paste verbatim into the
`"slide_data"` property.  Make sure to add a comma at the end if needed. The
`"sync_slide_*"` properties synchronize the slides with the remaining media.
Again, identify a slide change and tell LectureTube where that happens by
using a time specification as above.

Next, upload the entire `upload` directory to a web server. (The player will
*not* work as a local file, because of its use of
[XHRs](https://en.wikipedia.org/wiki/XMLHttpRequest).
Build a URL like so:

    http://your-server.edu/.../upload/html/player.html?descriptor=metadata/example.json

The `descriptor` URL is relative to `player.html`, but with an implicit "../"
added at the front.

You may also specify a starting point as an additional parameter:

    http://your-server.edu/.../upload/html/player.html?descriptor=...&seek=1:20:04

When you load your JSON file into the player for the first time, it may report
a 'parse error'. If that happens, paste your JSON file into [this
validator](http://jsonlint.com/). It'll tell you what you need to fix.

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

### I recorded my video in AVI

Welcome to a world of hurt. First, guvcview starts a new AVI file every
1.9GB, so you need to glue those files back together.  This command does that:

    mencoder -oac copy -ovc copy -o dest.avi capture-{1,2,3}.avi

GStreamer 1.0 doesn't like the resulting AVI file very much, so we use ffmpeg
to convert to an MKV container format:

    ffmpeg -i dest.avi -acodec copy -vcodec copy dest.mkv

You can tell that this is a better-behaved file because all of a sudden you can
seek in it in a video player. If you've made the mistake of mismatching frame
rate and audio rate, you'll see "duplicating/dropping frame" messages
warning you of fun up ahead.

Next, AVI is a format without absolute timestamps, so you may also need the
previous answer.

### One of my recording streams failed/produced garbage

That's why we have two, room and screen. That way, if one fails, the other can
partially cover the loss. We've run into several scenarios that, with just one
stream, would have left us entirely without coverage.

## License

LectureTube is licensed to you under the terms of the [MIT license](http://en.m.wikipedia.org/wiki/MIT_License).

Copyright (C) 2012 Andreas Klöckner

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Included Components

* [jQuery Core](http://jquery.com/) (MIT license)
* [jQuery UI](http://jqueryui.com/) (MIT license)
* [jQuery UI Layout Plugin](http://layout.jquery-dev.net/) (MIT license)
* [js-uri](https://code.google.com/p/js-uri/) (New BSD license)
* [JavaScript sprintf](http://www.diveintojavascript.com/projects/javascript-sprintf) (BSD license)
* [PopcornJS](http://popcornjs.org/) (MIT license)
