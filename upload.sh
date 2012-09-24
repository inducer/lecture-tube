#! /bin/sh
rsync -r -v --progress upload cims:public_html/hpc12-video
ssh cims "chmod a+rX -R public_html"
