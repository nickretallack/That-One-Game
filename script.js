// Generated by CoffeeScript 1.3.3
(function() {
  var Animated, Board, Game, Meter, Tile, Timer, V, Vector, cardinals, delay, get_time, random_choice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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
      this.element.css(V(this.board.tile_size, this.board.tile_size).css_size());
      this.element.css({
        'background-image': "url('images/" + this.type + ".png')"
      });
      this.re_position();
      this.element.on('click', this.clicked);
    }

    Tile.prototype.freeze = function() {
      this.element.off('click', this.clicked);
      return console.log("unbound");
    };

    Tile.prototype.move = function(position) {
      var distance, fall_duration;
      distance = this.position.y - position.y;
      fall_duration = distance * this.board.fall_speed;
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
      return this.element.css(this.position.scale(this.board.tile_size).css_position());
    };

    Tile.prototype.clicked = function() {
      return this.board.find_contiguous(this);
    };

    return Tile;

  })();

  Board = (function() {

    function Board(_arg) {
      var _ref, _ref1, _ref2,
        _this = this;
      this.element = _arg.element, this.size = _arg.size, this.combo_meter = _arg.combo_meter, this.minimum_break = _arg.minimum_break, this.tile_size = _arg.tile_size, this.fall_speed = _arg.fall_speed;
      if ((_ref = this.tile_types) == null) {
        this.tile_types = "burger pizza hotdog cookie icecream".split(' ');
      }
      if ((_ref1 = this.size) == null) {
        this.size = V(10, 9);
      }
      this.tile_size = 40;
      if ((_ref2 = this.minimum_break) == null) {
        this.minimum_break = 3;
      }
      this.fall_speed = 0.1;
      this.element.css(this.size.scale(this.tile_size).css_size());
      this.tiles = {};
      this.breaks = 0;
      this.broken_tiles = 0;
      this.biggest_break = 0;
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
        type: random_choice(this.tile_types)
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

    Board.prototype.freeze = function() {
      var _this = this;
      return this.iterate_positions(function(position) {
        var tile;
        tile = _this.get_tile(position);
        return tile.freeze();
      });
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
      if (results.length >= this.minimum_break) {
        if (this.combo_meter.at_goal()) {
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
        this.breaks += 1;
        this.broken_tiles += results.length;
        this.biggest_break = Math.max(this.biggest_break, results.length);
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

  Animated = (function() {

    function Animated() {
      this.time = get_time();
    }

    Animated.prototype.delta_time = function() {
      var delta, time;
      time = get_time();
      delta = time - this.time;
      this.time = time;
      return delta;
    };

    return Animated;

  })();

  Meter = (function(_super) {

    __extends(Meter, _super);

    function Meter(_arg) {
      var _ref, _ref1;
      this.element = _arg.element, this.drain_rate = _arg.drain_rate, this.goal = _arg.goal;
      Meter.__super__.constructor.call(this);
      _.bindAll(this);
      this.filling = this.element.find('.filling');
      this.display = this.element.find('.display');
      if ((_ref = this.goal) == null) {
        this.goal = 5;
      }
      if ((_ref1 = this.drain_rate) == null) {
        this.drain_rate = 100.0 / 1000;
      }
      this.fullness = 0;
      this.combo = 0;
      this.max_combo = 0;
      this.animate();
    }

    Meter.prototype.render = function() {
      this.display.text(this.combo);
      return this.filling.css({
        width: "" + this.fullness + "%"
      });
    };

    Meter.prototype.bump = function() {
      this.combo += 1;
      this.max_combo = Math.max(this.max_combo, this.combo);
      this.fullness = 100;
      return this.render();
    };

    Meter.prototype.at_goal = function() {
      return this.combo >= this.goal;
    };

    Meter.prototype.animate = function() {
      var delta;
      delta = this.delta_time();
      this.fullness = Math.max(this.fullness - this.drain_rate * delta, 0);
      if (this.fullness === 0) {
        this.combo = 0;
      }
      this.render();
      return webkitRequestAnimationFrame(this.animate);
    };

    return Meter;

  })(Animated);

  Timer = (function(_super) {

    __extends(Timer, _super);

    function Timer(_arg) {
      var _ref;
      this.element = _arg.element, this.time_limit = _arg.time_limit, this.callback = _arg.callback;
      Timer.__super__.constructor.call(this);
      _.bindAll(this);
      if ((_ref = this.time_limit) == null) {
        this.time_limit = 5;
      }
      this.time_remaining = this.time_limit * 1000;
      this.animate();
    }

    Timer.prototype.animate = function() {
      this.time_remaining -= this.delta_time();
      this.element.text(Math.max(0, Math.ceil(this.time_remaining / 1000.0)));
      if (this.time_remaining <= 0) {
        return this.callback();
      } else {
        return webkitRequestAnimationFrame(this.animate);
      }
    };

    return Timer;

  })(Animated);

  Game = (function() {

    function Game(_arg) {
      var template;
      this.element = _arg.element, this.size = _arg.size, this.time_limit = _arg.time_limit, this.combo_drain_rate = _arg.combo_drain_rate, this.combo_goal = _arg.combo_goal, this.minimum_break = _arg.minimum_break, this.tile_types = _arg.tile_types, this.tile_size = _arg.tile_size, this.tile_fall_speed = _arg.tile_fall_speed;
      _.bindAll(this);
      template = "<div id=\"timer\" class=\"timer\"></div>\n<div id=\"combo-meter\" class=\"meter\">\n    <div class=\"filling\"></div>\n    <div class=\"display\"></div>\n</div>\n<div id=\"board\" class=\"board\"></div>";
      this.element.html(template);
      this.timer = new Timer({
        element: this.element.find('#timer'),
        time_limit: this.time_limit,
        callback: this.end_game
      });
      this.combo_meter = new Meter({
        element: this.element.find('#combo-meter'),
        drain_rate: this.combo_drain_rate,
        goal: this.combo_goal
      });
      this.board = new Board({
        element: this.element.find('#board'),
        size: this.size,
        combo_meter: this.combo_meter,
        minimum_break: this.minimum_break,
        tile_types: this.tile_types,
        tile_size: this.tile_size,
        fall_speed: this.tile_fall_speed
      });
    }

    Game.prototype.end_game = function() {
      this.board.freeze();
      return this.element.append("<p>Portions Eaten: " + this.board.broken_tiles + "</p>\n<p>Bites: " + this.board.breaks + "</p>\n<p>Biggest Bite: " + this.board.biggest_break + "</p>\n<p>Max Combo: " + this.combo_meter.max_combo + "</p>");
    };

    return Game;

  })();

  $(function() {
    return $('#new-game').on('click', function() {
      return new Game({
        element: $('#game')
      });
    });
  });

}).call(this);
