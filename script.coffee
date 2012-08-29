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

V = (x,y) -> new Vector x,y

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
        @element.css
            position:'absolute'
        @element.css V(tile_size, tile_size).css_size()
        @re_position()
        @element.on 'click', @clicked

    re_position: ->
        @element.css @position.scale(tile_size).css_position()

    position_key: -> "#{@position.x}-#{@position.y}"

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

    register_tile: (tile) ->
        @tiles[tile.position_key()] = tile

    unregister_tile: (tile) ->
        delete @tiles[tile.position_key()]

    move_tile: (tile, position) ->
        unregister_tile tile
        tile.position = position
        register_tile tile

    find_contiguous: (tile) ->
        contigious = {}
        work_queue = [tile]
        while work_queue.length
            tile = work_queue.pop()


$ ->
    new Board
        element:$ '#game'