package parser

import (
	"errors"
	"strings"

	// "github.com/aquilax/tripcode"
	"meguca/common"
)

var (
	errNoPostPassword = errors.New("no post password")
	errNoSubject      = errors.New("no subject")
)

// ParseName parses the name field into a name and tripcode, if any
// func ParseName(name string) (string, string, error) {
// 	if name == "" {
// 		return name, name, nil
// 	}
// 	if len(name) > common.MaxLenName {
// 		return "", "", common.ErrNameTooLong
// 	}
// 	name = strings.TrimSpace(name)

// 	// #password for tripcodes and ##password for secure tripcodes
// 	firstHash := strings.IndexByte(name, '#')
// 	if firstHash > -1 {
// 		password := name[firstHash+1:]
// 		name = name[:firstHash]
// 		if password[0] == '#' {
// 			trip := tripcode.SecureTripcode(password[1:], "")
// 			return name, trip, nil
// 		}
// 		return name, tripcode.Tripcode(password), nil
// 	}

// 	return name, "", nil
// }

// ParseSubject verifies and trims a thread subject string
func ParseSubject(s string) (string, error) {
	if s == "" {
		return s, errNoSubject
	}
	if len(s) > common.MaxLenSubject {
		return s, common.ErrSubjectTooLong
	}
	return strings.TrimSpace(s), nil
}

// VerifyPostPassword verifies a post password exists does not surpass the
// maximum allowed length
func VerifyPostPassword(s string) error {
	if s == "" {
		return errNoPostPassword
	}
	if len(s) > common.MaxLenPostPassword {
		return common.ErrPostPasswordTooLong
	}
	return nil
}
