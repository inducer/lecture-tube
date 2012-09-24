# Andreas' lecture recording setup

## Source material

### Room adudio/video

Record room video and audio using a [Logitech HD Pro C910](http://www.amazon.com/Logitech-HD-Pro-Webcam-C910/dp/B003M2YT96)  (or equivalent). In any case, make sure to get a decent-quality [UVC](https://en.wikipedia.org/wiki/USB_video_device_class) camera capable of 1920p.

I use [guvcview](http://guvcview.sourceforge.net/) for lecture recording to capture AVI encapsulated MJPEG (video) and MP3 (audio). Careful: don't use the MKV/Matroska container format in guvcview--it becomes unusable after a crash. (v1.5.3, 9/24/2012) At 1920p, you will get about 20GB of data for a two-hour lecture.

An alternative on Macs is [this Logitech program](http://www.logitech.com/en-us/435/6816?section=downloads&bit=&osid=9), but this has failed us in various ways (bad audio, truncated video).

In addition to the reliability advantages, guvcview has the additional advantage that you can manipulate exposure and focus as you're recording.

### Capturing the screen

Use the command line

    ./capture-screen output-file.webm

to capture video of the screen. Note that this assumes a resolution of 1024x768. Change that in the script if your resolution is different.

### Capturing slide numbers

Use

    ./log-okular-pages > slide-log.txt

to time-coded log page numbers in the [Okular](https://en.wikipedia.org/wiki/Okular) PDF viewer.

## Posptrocessing



# postprocessing the screencap

    ffmpeg -i screencap.webm -vcodec copy 2012-09-05-2-screen-capture.webm

If the audio is broken, simply add `-an`.
