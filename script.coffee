tile_size = 40
tile_count =
    x:10
    y:9

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
            width:"#{tile_size}px"
            height:"#{tile_size}px"
        @re_position()
        @element.on 'click', @clicked

    re_position: ->
        @element.css
            left:@position.x * tile_size
            bottom:@position.y * tile_size

    position_key: -> "#{@position.x}-#{@position.y}"

    clicked: ->

class Board
    constructor:({@element}) ->
        @element.css
            width:"#{tile_count.x * tile_size}px"
            height:"#{tile_count.y * tile_size}px"
        @tiles = {}
        for x in [0...tile_count.x]
            for y in [0...tile_count.y]
                tile = new Tile
                    position:
                        x:x
                        y:y
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

$ ->
    new Board
        element:$ '#game'