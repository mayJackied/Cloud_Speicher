*frp Adresse*
8.130.215.175:8080

User {

*check_user_name*
get: /api/user/checkUserName
DTO: CheckUserNameDTO checkUserNameDTO
VO: Result<CheckUserNameVO checkUserNameVO>
no JWT

*creat_invite_code*
get: /api/user/creatInviteCode
VO: Result<CreatInviteCodeVO>

*register*
post: /api/user/register
DTO: RegisterDTO
VO: Result<LoginVO loginVO >
no JWT

*login*
post: /api/user/login
DTO: LoginDTO loginDTO
VO: Result<LoginVO loginVO >
no JWT

*delete*
post: /api/user/delete
VO: Result<Void>

*logout*
post: /api/user/logout
VO: Result<Void>
}

File {

*get_files*
get: /api/file/getFiles
VO: Result<List<MyFile> filesVOS>

*add_file*
post: /api/file/addFile
DTO: FileDTO addFileDTO
VO: Result<Void>

*delete_file*
post: /api/file/deleteFile
DTO: DeleteFileDTO deleteFileDTO
VO: Result<Void>

*rename_file*
post: /api/file/renameFile
DTO: RenameFileDTO renameFileDTO
VO: Result<Void>

*zip*
post: /api/file/zip
DTO: ZipFileDTO zipFileDTO

*unzip*
post: /api/file/unzip
DTO: ZipFileDTO zipFileDTO

*move_file*
post: /api/file/moveFile
DTO: MoveFileDTO moveFileDTO

*delete_bin_file*
post: /api/file/deleteBinFile
DTO: DeleteFileDTO deleteFileDTO

*deleteBinAllFiles*
post: /api/file/deleteBinAllFiles
DTO: DeleteBinAllFilesDTO deleteBinAllFilesDTO

*restoreFile*
post: /api/file/restoreFile
DTO: DeleteFileDTO deleteFileDTO

*init_upload*
get: /api/file/initUpload
VO: Result<String>

*continuable_upload_file*
post: /api/file/continuableUploadFile
DTO: ContinuableUploadDTO continuableUploadDTO
VO: Result<Void>

*get_uploaded_size*
get: /api/file/getUploadedSize
DTO: GetUploadedSizeDTO getUploadedSizeDTO
VO: Result<Long>

*close_upload*
post: /api/file/closeUpload
DTO: CloseUploadDTO closeUploadDTO
VO: Result<Void>

*download_file*
post: /api/file/downloadFile
DTO: ContinuableDownloadDTO continuableDownloadDTO
}