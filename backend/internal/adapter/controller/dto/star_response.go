package dto

type StarStatusResponse struct {
	Starred bool `json:"starred"`
	Count   int  `json:"count"`
}
