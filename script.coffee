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

tile_size = 40
tile_types = "red green blue yellow orange".split ' '
#tile_types = "burger hotdog pizza icecream banana ".split ' '
fall_speed = 0.1

random_choice = (choices) ->
    index = Math.floor(Math.random() * choices.length) % choices.length
    choices[index]

class Tile
    constructor:({@position, @board, @type}) ->
        _.bindAll @
        @element = $ """<div class="positioned tile #{@type}"></div>"""
        @element.css 'background-color':@type
        @element.css V(tile_size, tile_size).css_size()
        @re_position()
        @element.on 'click', @clicked

    freeze: ->
        @element.off 'click', @clicked
        console.log "unbound"

    move: (position) ->
        distance = @position.y - position.y
        fall_duration = distance * fall_speed
        @element.css
            '-webkit-transition':"bottom #{fall_duration}s linear"
        @position = position
        setTimeout @re_position

    remove: ->
        @element.css '-webkit-transition':"opacity 0.5s"
        setTimeout => @element.css opacity:0
        delay 500, => @element.remove()


    re_position: ->
        @element.css @position.scale(tile_size).css_position()

    clicked: ->
        @board.find_contiguous @

class Board
    constructor:({@element, @size, @combo_meter}) ->
        @element.css @size.scale(tile_size).css_size()
        @tiles = {}
        @breaks = 0
        @broken_tiles = 0
        @iterate_positions (position) =>
            tile = @make_tile position
            @register_tile tile

    make_tile: (position) ->
        tile = new Tile
            position:position
            board:@
            type:random_choice tile_types
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

        if results.length >= 3
            # spread to a bigger explosion if the meter is full
            if @combo_meter.combo > 5
                for tile in results
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

class Meter extends Animated
    constructor: ({@element, @drain_rate}) ->
        super()
        _.bindAll @
        @filling = @element.find '.filling'
        @display = @element.find '.display'
        @fullness = 0
        @combo = 0
        @max_combo = 0
        @animate()

    render: ->
        @display.text @combo
        @filling.css
            width:"#{@fullness}%"

    bump: ->
        @combo += 1
        @max_combo = Math.max @max_combo, @combo
        @fullness = 100
        @render()

    animate: ->
        delta = @delta_time()
        @fullness = Math.max @fullness - @drain_rate * delta, 0
        if @fullness is 0
            @combo = 0
        @render()
        webkitRequestAnimationFrame @animate

class Timer extends Animated
    constructor:({@element, @time_limit, @callback}) ->
        super()
        _.bindAll @
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
    constructor: ({@element, @size, @time_limit, @drain_rate}) ->
        _.bindAll @

        # Default settings
        @time_limit ?= 60
        @size ?= V 10,9 # number of tiles in the board
        @drain_rate ?= 100.0/1000 # how fast combos have to be

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
            drain_rate:@drain_rate
        @board = new Board
            element:@element.find '#board'
            size:@size
            combo_meter:@combo_meter

    end_game: ->
        @board.freeze()
        @element.append """
            <p>Tiles Broken: #{@board.broken_tiles}</p>
            <p>Successful Breaks: #{@board.breaks}</p>
            <p>Max Combo: #{@combo_meter.max_combo}</p>
        """

$ ->
    $('#new-game').on 'click', ->    
        new Game
            element:$ '#game'