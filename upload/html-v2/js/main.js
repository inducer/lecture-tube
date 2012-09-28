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

$().ready(function()
{
  var audio_index = 0;
  var playing = false;

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

  // }}}

  // {{{ info processing

  $.ajax({
      url: "../"+get_url_parameter("descriptor"),
      dataType: "text",
      success:
        function(data, text_status)
        {
          data = eval(data);
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
        },
      error:
        function error(jqXHR, textStatus, errorThrown)
        {
          alert("failed to load metadata: "+textStatus);
        }
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

    south__resizeable: true,
  });

  $("#position-slider").slider();
  $(function() {
    $( "#beginning" ).button({
      text: false,
      icons: {
        primary: "ui-icon-seek-start"
      }
    });
    $( "#play" ).button({
      text: false,
      icons: {
        primary: "ui-icon-play"
      }
    })
    .click(function() {
      play();
      var options;
      if ( $( this ).text() === "play" ) {
        options = {
          label: "pause",
          icons: {
            primary: "ui-icon-pause"
          }
        };
      } else {
        options = {
          label: "play",
          icons: {
            primary: "ui-icon-play"
          }
        };
      }
      $( this ).button( "option", options );
    });
  });

  // }}}


});

// vim: fdm=marker
