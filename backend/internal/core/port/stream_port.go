package port

// ByteReader abstracts a readable byte stream.
type ByteReader interface {
	Read(p []byte) (n int, err error)
}

// ByteWriter abstracts a writable byte stream.
type ByteWriter interface {
	Write(p []byte) (n int, err error)
}
