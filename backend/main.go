package main

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Role struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	HP      int    `json:"hp"`
	Speed   int    `json:"speed"`
	Stealth int    `json:"stealth"`
	Puzzle  int    `json:"puzzle"`
	Risk    int    `json:"risk"`
	Skill   string `json:"skill"`
}

type Teacher struct {
	Name  string   `json:"name"`
	Route [][2]int `json:"route"`
	Speed int      `json:"speed"`
}

type Level struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Width    int       `json:"width"`
	Height   int       `json:"height"`
	Tiles    []string  `json:"tiles"`
	Player   [2]int    `json:"player"`
	Key      [2]int    `json:"key"`
	Exit     [2]int    `json:"exit"`
	Teachers []Teacher `json:"teachers"`
}

var roles = []Role{
	{ID: "a", Name: "天阳", HP: 95, Speed: 90, Stealth: 45, Puzzle: 60, Risk: 85, Skill: "篮球突进"},
	{ID: "b", Name: "林萧", HP: 75, Speed: 70, Stealth: 70, Puzzle: 75, Risk: 50, Skill: "冷静判断"},
	{ID: "c", Name: "黄猫", HP: 65, Speed: 55, Stealth: 95, Puzzle: 85, Risk: 25, Skill: "无声移动"},
}

var level1 = Level{
	ID:     "level-1",
	Name:   "教学楼一层",
	Width:  12,
	Height: 10,
	Tiles: []string{
		"############",
		"#S....#....#",
		"#.##..#..K.#",
		"#....##....#",
		"#..T....##.#",
		"#.####.....#",
		"#......##..#",
		"#..H.......#",
		"#.......E..#",
		"############",
	},
	Player: [2]int{1, 1},
	Key:    [2]int{9, 2},
	Exit:   [2]int{8, 8},
	Teachers: []Teacher{
		{Name: "黄主任", Route: [][2]int{{3, 4}, {4, 4}, {5, 4}, {6, 4}}, Speed: 1},
		{Name: "韩老师", Route: [][2]int{{3, 7}, {4, 7}, {5, 7}, {6, 7}}, Speed: 1},
	},
}

func main() {
	r := gin.Default()
	r.Use(cors.Default())

	api := r.Group("/api")
	{
		api.GET("/roles", func(c *gin.Context) {
			c.JSON(http.StatusOK, roles)
		})

		api.GET("/levels/:id", func(c *gin.Context) {
			if c.Param("id") != "level-1" {
				c.JSON(http.StatusNotFound, gin.H{"error": "level not found"})
				return
			}
			c.JSON(http.StatusOK, level1)
		})

		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"ok": true})
		})
	}

	r.Run(":8080")
}
