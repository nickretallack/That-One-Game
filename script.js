// Generated by CoffeeScript 1.3.3
(function() {
  var Board, Meter, Tile, V, Vector, cardinals, delay, fall_speed, get_time, random_choice, tile_size, tile_types;

  Vector = (function() {

    function Vector(x, y) {
      this.x = x;
      this.y = y;
    }

    Vector.prototype.add = function(vector) {
      return V(vector.x + this.x, vector.y + this.y);
    };

    Vector.prototype.scale = function(factor) {
      return V(this.x * factor, this.y * factor);
    };

    Vector.prototype.css_position = function() {
      return {
        left: this.x,
        bottom: this.y
      };
    };

    Vector.prototype.css_size = function() {
      return {
        width: this.x,
        height: this.y
      };
    };

    Vector.prototype.hash_key = function() {
      return "" + this.x + "-" + this.y;
    };

    return Vector;

  })();

  V = function(x, y) {
    return new Vector(x, y);
  };

  cardinals = {
    left: V(-1, 0),
    right: V(1, 0),
    up: V(0, 1),
    down: V(0, -1)
  };

  delay = function(milliseconds, procedure) {
    return setTimeout(procedure, milliseconds);
  };

  tile_size = 40;

  tile_types = "red green blue yellow orange".split(' ');

  fall_speed = 0.1;

  random_choice = function(choices) {
    var index;
    index = Math.floor(Math.random() * choices.length) % choices.length;
    return choices[index];
  };

  Tile = (function() {

    function Tile(_arg) {
      this.position = _arg.position, this.board = _arg.board, this.type = _arg.type;
      _.bindAll(this);
      this.element = $("<div class=\"positioned tile " + this.type + "\"></div>");
      this.element.css({
        'background-color': this.type
      });
      this.element.css(V(tile_size, tile_size).css_size());
      this.re_position();
      this.element.on('click', this.clicked);
    }

    Tile.prototype.move = function(position) {
      var distance, fall_duration;
      distance = this.position.y - position.y;
      fall_duration = distance * fall_speed;
      this.element.css({
        '-webkit-transition': "bottom " + fall_duration + "s linear"
      });
      this.position = position;
      return setTimeout(this.re_position);
    };

    Tile.prototype.remove = function() {
      var _this = this;
      this.element.css({
        '-webkit-transition': "opacity 0.5s"
      });
      setTimeout(function() {
        return _this.element.css({
          opacity: 0
        });
      });
      return delay(500, function() {
        return _this.element.remove();
      });
    };

    Tile.prototype.re_position = function() {
      return this.element.css(this.position.scale(tile_size).css_position());
    };

    Tile.prototype.clicked = function() {
      return this.board.find_contiguous(this);
    };

    return Tile;

  })();

  Board = (function() {

    function Board(_arg) {
      var _this = this;
      this.element = _arg.element, this.size = _arg.size, this.combo_meter = _arg.combo_meter;
      this.element.css(this.size.scale(tile_size).css_size());
      this.tiles = {};
      this.iterate_positions(function(position) {
        var tile;
        tile = _this.make_tile(position);
        return _this.register_tile(tile);
      });
    }

    Board.prototype.make_tile = function(position) {
      var tile;
      tile = new Tile({
        position: position,
        board: this,
        type: random_choice(tile_types)
      });
      this.element.append(tile.element);
      return tile;
    };

    Board.prototype.iterate_positions = function(callback) {
      "Iterates from bottom to top.  Useful for applying gravity";

      var x, y, _i, _ref, _results;
      _results = [];
      for (y = _i = 0, _ref = this.size.y; 0 <= _ref ? _i < _ref : _i > _ref; y = 0 <= _ref ? ++_i : --_i) {
        _results.push((function() {
          var _j, _ref1, _results1;
          _results1 = [];
          for (x = _j = 0, _ref1 = this.size.x; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; x = 0 <= _ref1 ? ++_j : --_j) {
            _results1.push(callback(V(x, y)));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    Board.prototype.get_tile = function(position) {
      return this.tiles[position.hash_key()];
    };

    Board.prototype.register_tile = function(tile) {
      return this.tiles[tile.position.hash_key()] = tile;
    };

    Board.prototype.unregister_tile = function(tile) {
      return delete this.tiles[tile.position.hash_key()];
    };

    Board.prototype.move_tile = function(tile, position) {
      this.unregister_tile(tile);
      tile.move(position);
      return this.register_tile(tile);
    };

    Board.prototype.find_contiguous = function(start_tile) {
      var collected, current_tile, found_tile, hash_key, name, position, results, tile, vector, work_queue, _i, _j, _len, _len1;
      collected = {};
      collected[start_tile.position.hash_key()] = start_tile;
      work_queue = [start_tile];
      while (work_queue.length) {
        current_tile = work_queue.pop();
        for (name in cardinals) {
          vector = cardinals[name];
          position = current_tile.position.add(vector);
          hash_key = position.hash_key();
          if (!(hash_key in collected) && hash_key in this.tiles) {
            found_tile = this.tiles[hash_key];
            if (found_tile.type === start_tile.type) {
              collected[hash_key] = found_tile;
              work_queue.push(found_tile);
            }
          }
        }
      }
      results = _.values(collected);
      if (results.length >= 3) {
        if (this.combo_meter.combo > 3) {
          for (_i = 0, _len = results.length; _i < _len; _i++) {
            tile = results[_i];
            for (name in cardinals) {
              vector = cardinals[name];
              position = current_tile.position.add(vector);
              hash_key = position.hash_key();
              if (!(hash_key in collected) && hash_key in this.tiles) {
                found_tile = this.tiles[hash_key];
                collected[hash_key] = found_tile;
              }
            }
          }
          results = _.values(collected);
        }
        this.combo_meter.bump();
        for (_j = 0, _len1 = results.length; _j < _len1; _j++) {
          tile = results[_j];
          this.unregister_tile(tile);
          tile.remove();
        }
        return this.fall();
      }
    };

    Board.prototype.fall_column = function(x) {
      var group, groups, is_tile, offset, position, start_position, tile, top_y, _i, _j, _k, _len, _len1, _results;
      groups = this.group_column(x);
      offset = 0;
      for (_i = 0, _len = groups.length; _i < _len; _i++) {
        group = groups[_i];
        is_tile = group[0] != null;
        if (is_tile) {
          if (offset > 0) {
            for (_j = 0, _len1 = group.length; _j < _len1; _j++) {
              tile = group[_j];
              this.move_tile(tile, tile.position.add(V(0, -offset)));
            }
          }
        } else {
          offset += group.length;
        }
      }
      _results = [];
      for (top_y = _k = offset; offset <= 0 ? _k < 0 : _k > 0; top_y = offset <= 0 ? ++_k : --_k) {
        position = V(x, this.size.y - top_y);
        start_position = position.add(V(0, offset));
        tile = this.make_tile(start_position);
        tile.move(position);
        _results.push(this.register_tile(tile));
      }
      return _results;
    };

    Board.prototype.group_column = function(x) {
      var collecting_tiles, current_group, groups, is_tile, position, tile, y, _i, _ref;
      current_group = [];
      groups = [current_group];
      collecting_tiles = null;
      for (y = _i = 0, _ref = this.size.y; 0 <= _ref ? _i < _ref : _i > _ref; y = 0 <= _ref ? ++_i : --_i) {
        position = V(x, y);
        tile = this.get_tile(position);
        is_tile = tile != null;
        if (collecting_tiles == null) {
          collecting_tiles = is_tile;
        }
        if (collecting_tiles !== is_tile) {
          current_group = [];
          groups.push(current_group);
          collecting_tiles = is_tile;
        }
        current_group.push(tile);
      }
      return groups;
    };

    Board.prototype.fall = function() {
      var x, _i, _ref, _results;
      _results = [];
      for (x = _i = 0, _ref = this.size.x; 0 <= _ref ? _i < _ref : _i > _ref; x = 0 <= _ref ? ++_i : --_i) {
        _results.push(this.fall_column(x));
      }
      return _results;
    };

    return Board;

  })();

  get_time = function() {
    return new Date().getTime();
  };

  Meter = (function() {

    function Meter(_arg) {
      this.element = _arg.element, this.drain_rate = _arg.drain_rate;
      _.bindAll(this);
      this.filling = this.element.find('.filling');
      this.display = this.element.find('.display');
      this.fullness = 0;
      this.combo = 0;
      this.time = get_time();
      this.drain_some();
    }

    Meter.prototype.render = function() {
      this.display.text(this.combo);
      return this.filling.css({
        width: "" + this.fullness + "%"
      });
    };

    Meter.prototype.bump = function() {
      this.combo += 1;
      this.fullness = 100;
      return this.render();
    };

    Meter.prototype.delta_time = function() {
      var delta, time;
      time = get_time();
      delta = time - this.time;
      this.time = time;
      return delta;
    };

    Meter.prototype.drain_some = function() {
      var delta;
      delta = this.delta_time();
      this.fullness = Math.max(this.fullness - this.drain_rate * delta, 0);
      if (this.fullness === 0) {
        this.combo = 0;
      }
      this.render();
      return webkitRequestAnimationFrame(this.drain_some);
    };

    return Meter;

  })();

  $(function() {
    var combo_meter;
    combo_meter = new Meter({
      element: $('#combo-meter'),
      drain_rate: 100.0 / 1000
    });
    return new Board({
      element: $('#game'),
      size: V(10, 9),
      combo_meter: combo_meter
    });
  });

}).call(this);
