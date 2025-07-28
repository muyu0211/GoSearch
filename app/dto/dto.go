package dto

type SearchParams struct {
	Query          string   `json:"query"`
	CurrentPath    string   `json:"current_path"`
	FileType       []string `json:"file_type"`
	MinSize        uint64   `json:"min_size"`
	MaxSize        uint64   `json:"max_size"`
	ModifiedAfter  string   `json:"modified_after"`
	ModifiedBefore string   `json:"modified_before"`
}
