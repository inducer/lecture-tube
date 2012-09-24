function get_url_parameter(name)
{
  // http://www.netlobo.com/url_query_string_javascript.html
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec(window.location.href);
  if(results == null)
    return "";
  else
    return results[1];
}

// {{{ requestAnimationFrame polyfill

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

// }}}

// {{{ debug log

var msgnum = 0;
function set_message(what, timeout)
{

  ++msgnum;
  $("#messagearea").append(
      sprintf('<div id="msg_%d">%s</div>', msgnum, what))
  var my_msg = $("#msg_"+msgnum);

  if (timeout  == undefined)
    timeout = 10*1000;

  window.setTimeout(function() { my_msg.remove(); }, 10*1000)
}

function log_event(idx, name)
{
  return;
  set_message(sprintf("%s %d", name, idx));
}

// }}}

var show_info;
var popcorn_objs = new Array();

function set_up_slide_data(slides)
{
  if (slides.length == 0)
    return;

  var base_time = slides[0][1];

  for (var i = 0; i < slides.length; ++i)
  {
    var slide_time = Math.floor(slides[i][1] - base_time);

    var slide_min = Math.floor(slide_time / 60);
    var slide_sec = Math.floor(slide_time % 60);

    $("#slidelist").append(
        sprintf('<li id="slide_entry_%d">Slide %d (%d:%02d)</li>',
          i, slides[i][0], slide_min, slide_sec));
    $(sprintf("#slide_entry_%d", i)).click(
        function(evt)
        {
          var slide_index = new Number(evt.target.id.substr(12));
          var slide_nr = slides[slide_index][0];
          var time = slides[slide_index][1] - base_time - show_info.slide_sync_point;
          popcorn_objs[0].currentTime(time);

          for (var i = 0; i < show_info.media.length; ++i)
          {
            var media = show_info.media[i]
            media.popcorn.currentTime(time+media.sync_point);
          }
        });
  }
}

$().ready(function() {

  // {{{ splitter setup

  $("#container").splitter({
    type: "h",
    // sizeLeft: 150, minLeft: 100, maxLeft: 200,
    anchorToWindow: true,
    minBottom: 50,
    maxBottom: 200,
    //accessKey: "L"
  });
  // First horizontal splitters, nested in the right pane of the vertical splitter.
  $("#top-pane").splitter({
    type: "v",
    sizeLeft:true
    //sizeTop: 100, minTop: 50, maxTop: 200,
    //accessKey: "V"
  });

  // }}}

  // {{{ sync setup
  //
  // http://code.chirls.com/whiteknuckles/

  var audio_index = 0;
  var playing = false;
  var seeking_index = -1;
  var seek_following_counter = 0;
  var time_controlling_index = 0;

  // {{{ audio handling

  function update_audio_levels() {
    for (var i = 0; i < popcorn_objs.length; i++) {
      if (i != audio_index) {
        popcorn_objs[i].muted(true);
      } else {
        popcorn_objs[i].muted(false);
      }
    }
  }

  function select_audio(index)
  {
    audio_index = index;
    update_audio_levels();
  }

  $("#audio-selector")
    .change(
        function(evt)
        {
          var audio_name = $("#audio-selector").val();
          for (var i = 0; i < popcorn_objs.length; i++)
            if (audio_name == popcorn_objs[i].media.id)
              {
                select_audio(i);
                break;
              }
        });

  // }}}

  function sync() {
    // if no seeks are in progress
    if (seeking_index < 0 && seek_following_counter == 0)
    {
      var src = popcorn_objs[time_controlling_index];
      src_time = src.currentTime();

      for (var i = 0; i < popcorn_objs.length; i++)
      {
        var tgt = popcorn_objs[i];
        if (i != time_controlling_index
            && Math.abs(tgt.currentTime()-src_time) > 2)
        {
          set_message(
              sprintf("drift %d -> %d: %f",
                time_controlling_index, i,
                Math.abs(tgt.currentTime()-src_time)));

          tgt.currentTime(src_time);

          // set up a follow seek
          src.pause();
          do_pause(time_controlling_index);

          seeking_index = time_controlling_index;
          ++seek_following_counter;
        }
      }
    }

    requestAnimationFrame(sync);
  }


  function find_pop_index(pop)
  {
    for (var i = 0; i < popcorn_objs.length; i++)
    {
      if (popcorn_objs[i].media.id === pop.media.id)
        return i;
    }
    alert("no matching media element");
  }

  /* Things start to go a little haywire when you try to seek within a video.  That's why the code gets ugly from here on it.  */
  function seeking(evt)
  {
    var my_index = find_pop_index(this);
    log_event(my_index, "seeking");

    if (seeking_index < 0)
    {
      do_pause(my_index);
      seeking_index = my_index;
      set_message(sprintf("domseek %d", seeking_index));
    }
  }

  function seeked(evt)
  {
    var my_index = find_pop_index(this);
    log_event(my_index, "seeked");

    if (seeking_index < 0)
      return;
    else if (popcorn_objs[seeking_index].media.id != this.media.id)
      seek_following_counter--;

    if (seek_following_counter == 0)
    {
      var target_time = popcorn_objs[seeking_index].currentTime();
      for (var i = 0; i < popcorn_objs.length; i++)
      {
        if (popcorn_objs[i].media.id != this.media.id &&
          seeking_index != i &&
          popcorn_objs[i].currentTime() != target_time)
        {
          popcorn_objs[i].currentTime(target_time);
          seek_following_counter++;
        }
      }
      time_controlling_index = seeking_index;
    }

    if (seek_following_counter == 0) 
    {
      seeking_index = -1;
      if (playing) {
        play();
      }
      return;
    }

  }

  function play(evt)
  {
    var my_index = find_pop_index(this);
    log_event(my_index, "play");

    //first find target for setting currentTime
    //if (seeking_index <0) {
      playing = true;
      for (var i = 0; i < popcorn_objs.length; i++)
      {
        if (popcorn_objs[i].paused() && i != my_index)
        {
          if (0 && Math.abs(popcorn_objs[i].currentTime() - this.currentTime()) > 2)
          {
            if (this.currentTime() <= popcorn_objs[i].duration())
            {
              popcorn_objs[i].currentTime(this.currentTime());
            }
            else
            {
              popcorn_objs[i].currentTime(popcorn_objs[i].duration());
            }
          }
          else
            popcorn_objs[i].play();
        }
      }
    //}
  }



  function do_pause(trigger_idx) {
    if (seeking_index < 0) {
      playing = false;
      for (var i = 0; i < popcorn_objs.length; i++) {
        if (!popcorn_objs[i].paused() && i != trigger_idx)
          popcorn_objs[i].pause();
      }
    }
  }
  function pause(evt) {
    var my_index = find_pop_index(this);
    log_event(my_index, "pause");


    if (seeking_index < 0) 
    {
      do_pause(my_index);
    }
  }

  function dataunavailable(evt)
  {
    var my_index = find_pop_index(this);
    log_event(my_index, "nodata");
    do_pause(my_index);
  }

  function ended(evt)
  {
    var my_index = find_pop_index(this);
    log_event(my_index, "ended");
    if (popcorn_objs[time_controlling_index].media.id === my_index)
    {
      for (var i = 0; i < popcorn_objs.length; i++)
      {
        if (i == my_index && popcorn_objs[i].duration() > this.duration())
        {
          time_controlling_index = i;
          return;
        }
      }
    }
  }

  var load_count = 0;
  function can_play(evt)
  {
    if (++load_count == popcorn_objs.length)
    {
      // default_audio  is a stream index
      var default_audio = show_info.default_audio;
      if (default_audio == null)
        default_audio = 0;
      $("#audio-selector").val(popcorn_objs[default_audio].media.id);

      for (var i = 0; i < show_info.media.length; ++i)
      {
        var media = show_info.media[i]
        media.popcorn.currentTime(media.sync_point);
      }
      // sync();
    }
  }

  // {{{ info processing

  $.getJSON("../"+get_url_parameter("descriptor"),
      function(data, text_status)
      {
        show_info = data;

        $("#title-text").html(show_info.title);
        set_up_slide_data(show_info.slide_data);

        var min_sync_point = show_info.slide_sync_point;
        for (var i = 0; i < show_info.media.length; ++i)
          if (show_info.media[i].sync_point < min_sync_point)
            min_sync_point = show_info.media[i].sync_point;

        show_info.slide_sync_point = (
          show_info.slide_sync_point - min_sync_point);

        var audio_options = "";
        for (var i = 0; i < show_info.media.length; ++i)
        {
          var media = show_info.media[i]
          var media_id = media.identifier+"-video";
          var media_sel = "#"+media_id;
          var media_dom = $(media_sel)[0];
          media_dom.src = media.src;

          media.sync_point = media.sync_point - min_sync_point;

          var popcorn_obj = Popcorn(media_sel)
          popcorn_objs.push(popcorn_obj);
          media.popcorn = popcorn_obj;

          audio_options += sprintf("<option value=\"%s\">%s</option>",
            media_id,
            media.audio_name);
        }
        $("#audio-selector").html(audio_options);

        // {{{ set up popcorn events

        for (var i = 0; i < popcorn_objs.length; i++) 
        {
          popcorn_objs[i].on("play", play);
          /*
          popcorn_objs[i].on('pause', pause);
          popcorn_objs[i].on('seeking', seeking);
          popcorn_objs[i].on('seeked', seeked);
          popcorn_objs[i].on('ended', ended);

          popcorn_objs[i].on('dataunavailable', dataunavailable);
          popcorn_objs[i].on('waiting', dataunavailable);
          */

          popcorn_objs[i].on("canplay", can_play)
        }
        // }}}
      });

  // }}}

  // }}}

});

// vim: fdm=marker
