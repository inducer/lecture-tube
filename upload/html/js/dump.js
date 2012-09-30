
  function sync()
  {
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
