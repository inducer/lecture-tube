/*
 * LectureWeb player
 *
 * Copyright (C) 2012 Andreas Kloeckner

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

"use strict";

function format_time(seconds)
{
  var seconds = Math.floor(seconds);

  if (seconds > 3600)
  {
    var hours = Math.floor(seconds / 3600);
    var min = Math.floor((seconds-hours*3600) / 60);
    var sec = Math.floor(seconds % 60);
    return sprintf('%d:%02d:%02d', hours, min, sec);
  }
  else
  {
    var min = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);
    return sprintf('%d:%02d', min, sec);
  }
}

// {{{ debug log

var msg_num = 0;
var active_msg_count = 0;

/* valid msg_type values:
 * - error
 * - warning
 * - cmd (feedback acknowledging a user command)
 * - progress (update on stuff that might take a while)
 * - llprogress (low-level progress update)
 * - state (Updates from the state machine)
 * - event
 * - banner
 * - debug
 */

var shown_msg_types = [
  "banner",
  "error",
  "warning",
  "cmd",
  "progress",

  "state",
  "llprogress",
  "event",
  "debug"
  ];



function set_message(msg_type, what, timeout)
{
  if (shown_msg_types.indexOf(msg_type) == -1)
    return;

  ++msg_num;
  $("#messagearea").append(
      sprintf('<div id="msg_%d" class="msg-%s">%s</div>',
        msg_num, msg_type, what))
  var my_msg = $("#msg_"+msg_num);

  if (active_msg_count == 0)
  {
    $("#messagearea").show("slow");
  }
  ++active_msg_count;

  if (timeout  == undefined)
    timeout = 5*1000;

  window.setTimeout(function()
      {
        my_msg.remove();
        --active_msg_count;
        if (active_msg_count == 0)
          $("#messagearea").hide("slow");
      }, timeout)
}

// }}}

var show_info;
var popcorn_objs = new Object;
var num_popcorn_objs = 0;

function parse_min_sec_time(time)
{
  var result;
  if (time instanceof Array)
  {
    if (time.length == 2)
      result = time[0]*60 + time[1];
    else if (time.length == 3)
      result = time[0]*3600 + time[1]*60 + time[2];
    else
    {
      alert("Invalid time spec: "+time);
      return null;
    }
  }
  else
    result = time;

  if (result == null || result.toString() == "NaN")
  {
    alert("Invalid time spec: "+timespec[1]);
    return null;
  }

  return result;
}
function parse_abs_time(timespec)
{
  var ref_stream = timespec[0];
  var time = parse_min_sec_time(timespec[1]);

  var media_idx = show_info.media_name_to_idx[ref_stream];
  if (media_idx == null)
  {
    alert(sprintf("Media id '%s' not recognized.", ref_stream));
    return;
  }

  return show_info.media[media_idx].start_time + time;
}

function compute_abs_starting_points()
{
  var media_name_to_idx = new Object();
  for (var i = 0; i < show_info.media.length; ++i)
  {
    var obj = show_info.media[i];
    media_name_to_idx[obj.id] = i;
  }
  show_info.media_name_to_idx = media_name_to_idx;

  var tgt_to_last_start_time = new Object;

  var min_start_time = null;

  for (var i = 0; i < show_info.media.length; ++i)
  {
    var media = show_info.media[i];
    if (media.sync == null)
      media.start_time = 0;
    else
      media.start_time = parse_abs_time(media.sync.target_time) - parse_min_sec_time(media.sync.my_time);

    if (media.start_time == null || media.start_time.toString() == "NaN")
    {
      alert("Something went wrong computing start time for media id: "+media.id);
      return;
    }

    if (min_start_time == null || media.start_time < min_start_time)
      min_start_time = media.start_time;

    // make sure the media array is sorted wrt each target
    if (tgt_to_last_start_time[media.target] != null)
    {
      if (media.start_time < tgt_to_last_start_time[media.target])
        set_message("error", "Media array is not per-target-sorted at index "+i);
    }
    tgt_to_last_start_time[media.target] = media.start_time;
  }

  // move minimum start time to 0 to avoid confusion
  for (var i = 0; i < show_info.media.length; ++i)
  {
    var media = show_info.media[i];
    media.start_time = media.start_time - min_start_time;
  }
}

// {{{ slide setup

function set_up_jump_points()
{
  // {{{ process slides

  var slides = show_info.slide_data;

  if (slides == null || slides.length == 0)
    return;

  var sync_ref_time = parse_abs_time(show_info.sync_slide_time);

  // find sync slide number
  var sync_slide_index;

  for (var i = 0; i < slides.length; ++i)
  {
    var nr = slides[i][0], timestamp = slides[i][1];
    if (nr == show_info.sync_slide_number)
    {
      sync_slide_index = i;
      break;
    }
  }

  if (sync_slide_index == null)
  {
    alert("Slide for synchronization not found.");
    return;
  }

  var sync_slide_timestamp = slides[sync_slide_index][1];

  // }}}

  // {{{ build jump point list in memory
  //
  var all_jump_points = [];
  all_jump_points.push(["Start", show_info.start_time])
  for (var i = 0; i < slides.length; ++i)
  {
    var nr = slides[i][0], timestamp = slides[i][1];
    var new_slide_time = timestamp - sync_slide_timestamp + sync_ref_time;
    if (new_slide_time < 0)
      new_slide_time = 0;
    all_jump_points.push([sprintf("Slide %d", nr), new_slide_time])
  }

  var jump_points = show_info.jump_points;
  if (jump_points != null && jump_points.length != 0)
  {
    for (var i = 0; i < jump_points.length; ++i)
    {
      var label = jump_points[i][0];
      var time = parse_abs_time(jump_points[i][1]);

      all_jump_points.push([label, time])
    }
  }

  all_jump_points.sort(function (row_a, row_b) { return row_a[1] - row_b[1]; })

  // }}}

  // {{{ build jump point list DOM

  var jump_point_count = 0;
  function insert_jump_point(descr, time)
  {
    $("#jump-list").append(
        sprintf('<li id="jump_entry_%d">%s (%s)</li>',
          jump_point_count, descr, format_time(time)));
    $(sprintf("#jump_entry_%d", jump_point_count)).click(
        function(evt)
        {
          seek(time);
        });
    ++jump_point_count;
  }

  for (var i = 0; i < all_jump_points.length; ++i)
  {
    var label = all_jump_points[i][0];
    var time = all_jump_points[i][1];

    insert_jump_point(label, time);
  }

  // }}}
}

// }}}

// {{{ media state machine

var POSSIBLE_STATES = [
  "playing",
  "paused", // (but everybody is ready)
  "seeking_to_play", // (*)
  "seeking", // (*)
  "waiting" // (*)
  // states marked with (*) have a meaningful ready_count
  ]

var media_state = null;
var ready_count = 0;
var broken_target_ids = [];
var tgt_to_pending_commands = new Object;

function is_busy()
{
  return (
      media_state == "seeking"
      || media_state == "seeking_to_play"
      || media_state == "waiting");
}

function is_playing()
{
  return (
      media_state == "playing"
      || media_state == "seeking_to_play"
      || media_state == "waiting");
}

function clear_pending_seeks()
{
  for (var tgt_id in popcorn_objs)
  {
    var i = 0;
    var cmds = tgt_to_pending_commands[tgt_id];
    while (i < cmds.length)
    {
      var cmd_name = cmds[i][0];
      if (cmd_name == "seek")
        cmds.splice(i, 1);
      else
        ++i;
    }
  }
}

function break_or_seek(tgt_id, time)
{
  var pco = popcorn_objs[tgt_id];
  if (time < 0 || time > pco.duration())
  {
    set_message("warning", sprintf("Seek outside of '%s'. ", tgt_id));
    break_target_id(tgt_id);
    return false;
  }
  pco.pause(time);
  return true;
}

function execute_pending_commands(tgt_id)
{
  var is_ready = true;
  while (tgt_to_pending_commands[tgt_id].length)
  {
    var cmd = tgt_to_pending_commands[tgt_id].shift();
    var cmd_name = cmd[0];
    var cmd_arg = cmd[1];

    if (cmd_name == "seek")
    {
      set_message("llprogress", sprintf("Executing pending seek on stream '%s'.", tgt_id));
      is_ready = !break_or_seek(tgt_id, cmd_arg);
      break;
    }
    else if (cmd_name == "set_mute")
    {
      popcorn_objs[tgt_id].mute(cmd_arg);
    }
    else
    {
      set_message("error", "Invalid command in queue of pending commands: "+cmd_name);
    }
  }

  return is_ready;
}

function set_media_state(s)
{
  if (POSSIBLE_STATES.indexOf(s) == -1)
  {
    alert("Invalid state: "+s);
    return;
  }

  set_message("state", "New state: "+s);
  media_state = s;
  if (is_busy())
    $("#busy-img").show();
  else
    $("#busy-img").hide();

  var options;
  if (is_playing())
  {
    options = {
      label: "pause",
      icons: {
        primary: "ui-icon-pause"
      }
    };
  }
  else
  {
    options = {
      label: "play",
      icons: {
        primary: "ui-icon-play"
      }
    };
  }
  $("button#play").button( "option", options );
}

function break_target_id(tgt_id)
{
  if (broken_target_ids.indexOf(tgt_id) != -1)
  {
    // already broken
    return;
  }
  broken_target_ids.push(tgt_id);
  popcorn_objs[tgt_id].pause();

  set_message("warning", "stream in broken state: "+tgt_id)
}

function unbreak_target_id(tgt_id)
{
  var idx = broken_target_ids.indexOf(tgt_id);
  if (idx == -1)
    return;

  broken_target_ids.splice(idx, 1);
  set_message("warning", "stream no longer in broken state: "+tgt_id)
}

function is_target_id_broken(tgt_id)
{
  return broken_target_ids.indexOf(tgt_id) != -1;
}


// {{{ commands

function seek(time)
{
  set_message("cmd", "Seeking to "+format_time(time)+"...");
  $("#position-label").html(format_time(time));
  $("#position-slider").slider("option", "value", time);

  var target_to_media_url_and_time = new Object();
  for (var i = 0; i < show_info.media.length; ++i)
  {
    var media = show_info.media[i];
    if (time >= media.start_time)
    {
      target_to_media_url_and_time[media.target] = [
        media.src, time - media.start_time];
    }
  }

  clear_pending_seeks();
  if (is_playing())
  {
    // pause all media until seek completes
    for (var tgt_id in popcorn_objs)
    {
      var pco = popcorn_objs[tgt_id];
      pco.pause();
    }

    set_media_state("seeking_to_play");
  }
  else
    set_media_state("seeking");

  ready_count = 0;

  for (var tgt_id in popcorn_objs)
  {
    var value = target_to_media_url_and_time[tgt_id];
    if (value == null)
    {
      set_message("warning", "No video found during seek for "+tgt_id);
      break_target_id(tgt_id);
      continue;
    }

    if (is_target_id_broken(tgt_id))
      unbreak_target_id(tgt_id);

    var pco = popcorn_objs[tgt_id];

    var src = value[0];
    var time = value[1];
    src = new URI(src).resolve(new URI(window.location.href));
    if (pco.media.src != src)
    {
      set_message("progress", sprintf("Stream '%s' loading media...", tgt_id));
      tgt_to_pending_commands[tgt_id].push(["seek", time]);
      pco.media.src = src;
    }
    else
    {
      set_message("llprogress", sprintf("Stream '%s' already on right file, seeking...", tgt_id));
      break_or_seek(tgt_id, time);
    }
  }
}

function play()
{
  if (media_state == "paused")
  {
    set_media_state("playing");
    for (var tgt_id in popcorn_objs)
    {
      if (is_target_id_broken(tgt_id))
        continue;

      var pco = popcorn_objs[tgt_id];
      pco.play();
    }
  }
  else if (media_state == "seeking")
  {
    set_media_state("seeking_to_play");
  }
  else
    set_message("Invalid media state in play: "+media_state);
}

function pause()
{
  if (media_state == "playing")
  {
    set_media_state("paused");
    for (var tgt_id in popcorn_objs)
    {
      if (is_target_id_broken(tgt_id))
        continue;

      var pco = popcorn_objs[tgt_id];
      pco.pause();
    }
  }
  else if (media_state == "seeking_to_play")
  {
    set_media_state("seeking");
  }
  else
    set_message("Invalid media state in play: "+media_state);
}

function set_mute(tgt_id, v)
{
  if (media_state == "seeking")
    tgt_to_pending_commands[tgt_id].push(["set_mute", v]);
  else
    popcorn_objs[tgt_id].muted(v);
}

// }}}

// {{{ event handlers

function can_play(evt)
{
  set_message("event", "can_play on "+this.media.id);

  if (media_state == "playing")
  {
    // Big whoop.
  }
  else if (media_state == "seeking" || media_state == "seeking_to_play")
  {
    execute_pending_commands(this.media.id);
  }
  else if (media_state == "paused")
  {
    // no action
  }
  else if (media_state == "waiting")
  {
    var all_buffered = true;
    for (var tgt_id in popcorn_objs)
    {
      if (is_target_id_broken(tgt_id))
        continue;

      var pco = popcorn_objs[tgt_id];
      if (!pco.buffered())
        all_buffered = false;
    }

    if (all_buffered)
    {
      for (var tgt_id in popcorn_objs)
      {
        if (is_target_id_broken(tgt_id))
          continue;

        var pco = popcorn_objs[tgt_id];
        pco.play();
      }
      set_media_state("playing");
    }
    else
      set_message("debug", "Couldn't resume from waiting because not "
          + "all streams are buffered yet.");
  }
  else
    set_message("error", "Invalid media state in can_play: "+media_state);
}

function data_unavailable(evt)
{
  set_message("event", "data_unavailable on "+this.media.id);
}

function video_waiting(evt)
{
  set_message("event", "waiting on "+this.media.id);

  if (media_state == "seeking" || media_state == "seeking_to_play")
  {
    // That's expected.
    return;
  }
  else if (media_state == "playing")
  {
    // One of our streams is buffering. Pause everybody.
    for (var tgt_id in popcorn_objs)
    {
      if (is_target_id_broken(tgt_id))
        continue;

      var pco = popcorn_objs[tgt_id];
      pco.pause();
    }

    set_media_state("waiting");
  }
  else
    set_message("error", "Invalid media state in waiting: "+media_state);
}

function seek_complete(evt)
{
  set_message("event", "seek_complete on "+this.media.id);

  if (media_state == "seeking")
  {
    var is_ready = execute_pending_commands(this.media.id);
    if (is_ready)
    {
      ++ready_count;
      if (ready_count == num_popcorn_objs - broken_target_ids.length)
        set_media_state("paused");
    }
  }
  else if (media_state == "seeking_to_play")
  {
    var is_ready = execute_pending_commands(this.media.id);
    if (is_ready)
    {
      ++ready_count;
      if (ready_count == num_popcorn_objs - broken_target_ids.length)
      {
        set_media_state("playing");
        for (var tgt_id in popcorn_objs)
        {
          if (is_target_id_broken(tgt_id))
            continue;

          var pco = popcorn_objs[tgt_id];
          pco.play();
        }
      }
    }
  }
  else
    set_message("error", "Invalid media state in can_play: "+media_state);
}

function video_failed(e)
{
  set_message("error", "error on "+this.media.id);

  break_target_id(this.media.id);

  var id = this.media.id;
  switch (e.target.error.code) {
    case e.target.error.MEDIA_ERR_ABORTED:
      // This happens when navigating to a different page. No problem.
      // alert(sprintf("Error on stream '%s': User aborted the video playback.", id));
      break;
    case e.target.error.MEDIA_ERR_NETWORK:
      alert(sprintf("Error on stream '%s': A network error caused the video "
         + "download to fail part-way. We're currently investigating this. "
         + "Please complain on the mailing list, then reload to try again.", id));
      break;
    case e.target.error.MEDIA_ERR_DECODE:
      alert(sprintf("Error on stream '%s': The video playback was aborted due "
         + "to a corruption problem or because the video used features your "
         + "browser did not support.", id));
      break;
    case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
      alert(sprintf("Error on stream '%s': The video could not be loaded, either "
         + "because the server or network failed or because the format is not supported.", id));
      break;
    default:
      alert(sprintf("Error on stream '%s': An unknown error occurred.", id));
      break;
  }
}

function video_stalled(e)
{
  set_message("event", "stalled: "+this.media.id);

  // This is just about prefetching not working as expected.
  // No reason to break the stream.
}

function video_ended(e)
{
  set_message("event", "ended: "+this.media.id);

  break_target_id(this.media.id);
}

function time_update(e)
{
  // set_message("event", "time_update on "+this.media.id);
  var media_id = this.media.id;
  var time = this.currentTime();

  // ignore time updates from 'broken' streams.
  if (is_target_id_broken(media_id))
    return;

  for (var i = 0; i < show_info.media.length; ++i)
  {
    var media_desc = show_info.media[i];

    if (media_desc.target == media_id
        && new URI(media_desc.src).resolve(new URI(window.location.href))
        == this.media.src)
    {
      var abs_time = time+media_desc.start_time;
      var pos_label = $("#position-label");
      if (!pos_label.hasClass("sliding"))
      {
        pos_label.html(format_time(abs_time));
        $("#position-slider").slider("option", "value", abs_time);
      }
      break;
    }
  }
}

// }}}


// }}}


$().ready(function()
{
  set_message("banner",
    "<strong><a href=\"https://github.com/inducer/lecture-web\">LectureWeb</a> 2012.1alpha</strong>"
    +"<br><i>Available under the MIT license</i>");


  if (!$.browser.chrome)
  {
    set_message("warning", "LectureWeb works best in Google Chrome for now. See the "
      +"<a href=\"https://github.com/inducer/lecture-web\">project page</a> for more info.");
  }

  // {{{ audio handling

  function select_audio(sel_player_id)
  {
    for (var player_id in popcorn_objs)
      set_mute(player_id, player_id != sel_player_id);
  }

  $("#audio-selector")
    .change(
        function(evt)
        {
          select_audio($("#audio-selector").val());
        });

  // }}}

  // {{{ UI setup

  $("body").layout({
    // applyDemoStyles: true,
    east__size: ($(window).width()-10)*(.43),
    north__closable: false,
    north__spacing_open: 0,
    north__resizable: false,
    north__size: 45,

    south__size: 220,
    south__resizeable: true,
    south__slidable: false,
  });

  $("#position-slider").slider({
    disabled: true, // until we know our duration
    slide: (function (evt)
      {
        var val = $("#position-slider").slider("option", "value");
        $("#position-label")
          .html(format_time(val))
          .addClass("sliding");
        return true;
      }),
    stop: (function (evt)
      {
        $("#position-label")
          .html("")
          .removeClass("sliding");
      }),
    change: (function (evt, ui)
      {
        if (evt.originalEvent == null)
        {
          // programmatic change
          return;
        }
        var val = $("#position-slider").slider("option", "value");
        seek(val);
      })
  });

  $( "#beginning" ).button({
    text: false,
    icons: { primary: "ui-icon-seek-start" }
  })
  .click(function() {
    seek(show_info.start_time);
  });

  $( "#play" ).button({
    text: false,
    icons: { primary: "ui-icon-play" }
  })
  .click(function() {
    if (is_playing())
      pause();
    else
      play();
  });

  // }}}

  // {{{ info processing

  set_message("progress", "Loading metadata...");
  var query = new URI(window.location.href).parseQuery();

  $.ajax({
      url: "../"+query.getParam("descriptor"),
      dataType: "json",
      success:
        function(data, text_status)
        {
          set_message("progress", "Loaded, initializing...");
          show_info = data;

          if (show_info.title != null)
            $("#title-text").html(show_info.title);
          if (show_info.blurb != null)
            $("#blurb").html(show_info.blurb);

          compute_abs_starting_points();

          // {{{ start/end time business

          if (show_info.start_time == null)
            show_info.start_time = 0;
          else
            show_info.start_time = parse_abs_time(show_info.start_time);

          show_info.duration = parse_abs_time(show_info.end_time);
          $("#position-slider")
            .slider("option", "max", show_info.duration)
            .slider("option", "disabled", false);
          $("#duration-label").html(format_time(show_info.duration));

          // }}}

          set_up_jump_points();

          if (show_info.end_time == null)
            alert("End time not given.");

          /// {{{ set up audio choices
          var audio_options = "";
          for (var player_id in show_info.audio_names)
          {
            var selected;
            if (player_id == show_info.default_audio)
              selected = "selected";
            else
              selected = "";

            audio_options += sprintf("<option value=\"%s\" %s>%s</option>",
              player_id,
              selected,
              show_info.audio_names[player_id]);
          }

          $("#audio-selector").html(audio_options);

          // }}}

          // {{{ initialize popcorn objects

          var used_media_targets = new Object();
          for (var i = 0; i < show_info.media.length; ++i)
          {
            var media = show_info.media[i];
            used_media_targets[media.target] = 1;
          }

          for (var tgt in used_media_targets)
          {
            var popcorn_obj = Popcorn("#"+tgt)
            popcorn_objs[tgt] = popcorn_obj;

            popcorn_objs[tgt].on('dataunavailable', data_unavailable);
            popcorn_objs[tgt].on('waiting', video_waiting);

            popcorn_objs[tgt].on("canplay", can_play)
            popcorn_objs[tgt].on("seeked", seek_complete)
            popcorn_objs[tgt].on("error", video_failed)
            popcorn_objs[tgt].on("stalled", video_stalled)
            popcorn_objs[tgt].on("timeupdate", time_update)
            popcorn_objs[tgt].on("ended", video_ended)

            tgt_to_pending_commands[tgt] = [];
            ++num_popcorn_objs;
          }

          // }}}

          // {{{ start up

          seek(show_info.start_time);

          if (show_info.default_audio != null)
            select_audio(show_info.default_audio);
          else
            alert("No default audio track given.");

          // }}}

        },
      error:
        function error(jqXHR, textStatus, errorThrown)
        {
          alert("failed to load metadata: "+textStatus);
        }
    });

  // }}}

});

// vim: fdm=marker
