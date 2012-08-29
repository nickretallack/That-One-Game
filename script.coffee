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

tile_size = 40
tile_count = V 10,9
tile_types = "burger hotdog pizza".split ' '

random_choice = (choices) ->
    index = Math.floor(Math.random() * choices.length) % choices.length
    choices[index]

class Tile
    constructor:({@position, @board, @type}) ->
        _.bindAll @
        @element = $ """<div class="positioned tile #{@type}"></div>"""
        @element.css position:'absolute'
        @element.css V(tile_size, tile_size).css_size()
        @re_position()
        @element.on 'click', @clicked

    re_position: ->
        @element.css @position.scale(tile_size).css_position()

    clicked: ->
        @board.find_contiguous @

class Board
    constructor:({@element}) ->
        @element.css tile_count.scale(tile_size).css_size()
        @tiles = {}
        for x in [0...tile_count.x]
            for y in [0...tile_count.y]
                tile = new Tile
                    position:V(x,y)
                    board:@
                    type:random_choice tile_types
                @register_tile tile
                @element.append tile.element

    get_tile: (position) ->
        @tiles[tile.position.hash_key()]

    register_tile: (tile) ->
        @tiles[tile.position.hash_key()] = tile

    unregister_tile: (tile) ->
        delete @tiles[tile.position.hash_key()]

    move_tile: (tile, position) ->
        unregister_tile tile
        tile.position = position
        register_tile tile

    find_contiguous: (start_tile) ->
        collected = {}
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
        for tile in results
            tile.element.css
                background:'green'


$ ->
    new Board
        element:$ '#game'