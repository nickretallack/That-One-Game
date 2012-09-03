class Vector
    constructor:(@x,@y) ->
    add:(vector) -> V vector.x + @x, vector.y + @y
    scale:(factor) -> V @x*factor, @y*factor
    css_position: ->
        left:@x
        bottom:@y
    css_size: ->
        width:@x
        height:@y
    hash_key: ->
        "#{@x}-#{@y}"

V = (x,y) -> new Vector x,y

cardinals =
    left:V(-1,0)
    right:V(1,0)
    up:V(0,1)
    down:V(0,-1)

delay = (milliseconds, procedure) -> setTimeout procedure, milliseconds

random_choice = (choices) ->
    index = Math.floor(Math.random() * choices.length) % choices.length
    choices[index]

class Tile
    constructor:({@position, @board, @type}) ->
        _.bindAll @
        @element = $ """<div class="positioned tile #{@type}"></div>"""
        @element.css V(@board.tile_size, @board.tile_size).css_size()
        @element.css 'background-image':"url('images/#{@type}.png')"
        @re_position()
        @element.on 'click', @clicked

    freeze: ->
        @element.off 'click', @clicked
        console.log "unbound"

    move: (position) ->
        distance = @position.y - position.y
        fall_duration = distance * @board.fall_speed
        @element.css
            '-webkit-transition':"bottom #{fall_duration}s linear"
        @position = position
        delay @board.break_delay, @re_position

    remove: ->
        @element.css '-webkit-transition':"opacity #{@board.break_delay/1000}s"
        setTimeout => @element.css opacity:0
        delay @board.break_delay, => @element.remove()


    re_position: ->
        @element.css @position.scale(@board.tile_size).css_position()

    clicked: ->
        @board.find_contiguous @

class Board
    constructor:({@element, @size, @combo_meter, @minimum_break, @tile_size, @fall_speed}) ->
        @tile_types ?= "burger pizza hotdog cookie icecream".split ' '
        @size ?= V 10,9 # number of tiles in the board
        @tile_size = 40
        @minimum_break ?= 3
        @fall_speed = 0.05

        @element.css @size.scale(@tile_size).css_size()

        @tiles = {}
        @breaks = 0
        @broken_tiles = 0
        @biggest_break = 0
        @break_delay = 200

        @iterate_positions (position) =>
            tile = @make_tile position
            @register_tile tile

    make_tile: (position) ->
        tile = new Tile
            position:position
            board:@
            type:random_choice @tile_types
        @element.append tile.element
        tile

    iterate_positions: (callback) ->
        """Iterates from bottom to top.  Useful for applying gravity"""
        for y in [0...@size.y]
            for x in [0...@size.x]
                callback V(x,y)        

    freeze: ->
        @iterate_positions (position) =>
            tile = @get_tile position
            tile.freeze()            

    get_tile: (position) ->
        @tiles[position.hash_key()]

    register_tile: (tile) ->
        @tiles[tile.position.hash_key()] = tile

    unregister_tile: (tile) ->
        delete @tiles[tile.position.hash_key()]

    move_tile: (tile, position) ->
        @unregister_tile tile
        tile.move position
        @register_tile tile

    find_contiguous: (start_tile) ->
        collected = {}
        collected[start_tile.position.hash_key()] = start_tile
        work_queue = [start_tile]
        while work_queue.length
            current_tile = work_queue.pop()
            for name, vector of cardinals
                position = current_tile.position.add vector
                hash_key = position.hash_key()
                if hash_key not of collected and hash_key of @tiles
                    found_tile = @tiles[hash_key]
                    if found_tile.type is start_tile.type
                        collected[hash_key] = found_tile
                        work_queue.push found_tile
        results = _.values collected

        if results.length >= @minimum_break
            # spread to a bigger explosion if the meter is full
            if @combo_meter.at_goal()
                for current_tile in results
                    for name, vector of cardinals
                        position = current_tile.position.add vector
                        hash_key = position.hash_key()
                        if hash_key not of collected and hash_key of @tiles
                            found_tile = @tiles[hash_key]
                            collected[hash_key] = found_tile
                results = _.values collected

            @combo_meter.bump()
            @breaks += 1
            @broken_tiles += results.length
            @biggest_break = Math.max @biggest_break, results.length
            for tile in results
                @unregister_tile tile
                tile.remove()
            @fall()

    fall_column: (x) ->
        # Rows are isolated, so we can make them fall one at a time
        groups = @group_column x
        offset = 0
        for group in groups
            is_tile = group[0]?
            if is_tile
                if offset > 0
                    for tile in group
                        @move_tile tile, tile.position.add V(0,-offset)
            else
                offset += group.length

        for top_y in [offset...0]
            # Create the tiles where they would be above the board,
            # then make them slide into place
            position = V(x, @size.y - top_y)
            start_position = position.add V(0,offset)

            tile = @make_tile start_position
            tile.move position
            @register_tile tile

    group_column: (x) ->
        current_group = []
        groups = [current_group]
        collecting_tiles = null
        for y in [0...@size.y]
            position = V(x,y)
            tile = @get_tile position
            is_tile = tile?
            collecting_tiles ?= is_tile
            if collecting_tiles != is_tile
                # We were collecting tiles and found a space,
                # or we were collecting spaces and found a tile
                # Start a new group.
                current_group = []
                groups.push current_group
                collecting_tiles = is_tile
            current_group.push tile
        groups

    fall: ->
        for x in [0...@size.x]
            @fall_column x

get_time = -> new Date().getTime()

class Animated
    constructor: ->
        @time = get_time()
    delta_time: ->
        time = get_time()
        delta = time - @time
        @time = time
        delta

class Meter
    constructor: ({@element, @timeout, @goal}) ->
        _.bindAll @
        @filling = @element.find '.filling'
        @display = @element.find '.display'

        @goal ?= 5
        @timeout ?= 1000
        @combo = 0
        @max_combo = 0

    bump: ->
        @combo += 1
        @max_combo = Math.max @max_combo, @combo
        @display.text @combo
        @filling.css
            '-webkit-transition':'none'
            width:'100%'
        setTimeout =>
            @filling.css
                '-webkit-transition':"width #{@timeout / 1000}s linear"
                width:0
        delay @timeout, =>
            @combo = 0
            @display.text @combo

    at_goal:
        @combo >= @goal

class Timer extends Animated
    constructor:({@element, @time_limit, @callback}) ->
        super()
        _.bindAll @
        @time_limit ?= 60
        @time_remaining = @time_limit * 1000
        @animate()

    animate: ->
        @time_remaining -= @delta_time()
        @element.text Math.max 0, Math.ceil @time_remaining/1000.0
        if @time_remaining <= 0
            @callback()
        else
            webkitRequestAnimationFrame @animate

class Game
    constructor: ({@element, @size, @time_limit, @combo_timeout, @combo_goal, @minimum_break, @tile_types, @tile_size, @tile_fall_speed}) ->
        _.bindAll @

        template = """
            <div id="timer" class="timer"></div>
            <div id="combo-meter" class="meter">
                <div class="filling"></div>
                <div class="display"></div>
            </div>
            <div id="board" class="board"></div>
        """
        @element.html template
        @timer = new Timer
            element:@element.find '#timer'
            time_limit:@time_limit
            callback:@end_game
        @combo_meter = new Meter
            element:@element.find '#combo-meter'
            timeout:@combo_timeout
            goal:@combo_goal
        @board = new Board
            element:@element.find '#board'
            size:@size
            combo_meter:@combo_meter
            minimum_break:@minimum_break
            tile_types:@tile_types
            tile_size:@tile_size
            fall_speed:@tile_fall_speed

    end_game: ->
        @board.freeze()
        @element.append """
            <p>Portions Eaten: #{@board.broken_tiles}</p>
            <p>Bites: #{@board.breaks}</p>
            <p>Biggest Bite: #{@board.biggest_break}</p>
            <p>Max Combo: #{@combo_meter.max_combo}</p>
        """

$ ->
    $('#new-game').on 'click', ->    
        new Game
            element:$ '#game'