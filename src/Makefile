VERSION=unknown

ifdef DEVICE
# Device build
STAGING_DIR=/srv/preware/build/staging/armv7
ifeq ($(shell uname -s),Darwin)
CC=/opt/PalmPDK/arm-gcc/bin/arm-none-linux-gnueabi-gcc
else
CC=/srv/preware/build/toolchain/cs07q3armel/build/arm-2007q3/bin/arm-none-linux-gnueabi-gcc
endif
else
# Emulator build
STAGING_DIR=/srv/preware/build/staging/i686
ifeq ($(shell uname -s),Darwin)
CC=/opt/PalmPDK/i686-gcc/bin/i686-nptl-linux-gnu-gcc --sysroot=/opt/PalmPDK/i686-gcc/sys-root
else
CC=/srv/preware/build/toolchain/i686-unknown-linux-gnu/build/i686-unknown-linux-gnu/bin/i686-unknown-linux-gnu-gcc
endif
endif

CPPFLAGS := -g -DVERSION=\"${VERSION}\" -I${STAGING_DIR}/usr/include/glib-2.0 -I${STAGING_DIR}/usr/lib/glib-2.0/include -I${STAGING_DIR}/usr/include
LDFLAGS  := -g -L${STAGING_DIR}/usr/lib -llunaservice -ljson-c -lglib-2.0 -lpthread

lumberjack: lumberjack.o luna_service.o luna_methods.o

HOST = cdma-pre

install: lumberjack
#	- ssh root@${HOST} killall org.webosinternals.lumberjack
#	scp lumberjack root@${HOST}:/var/usr/sbin/org.webosinternals.lumberjack.new
#	ssh root@${HOST} mv /var/usr/sbin/org.webosinternals.lumberjack.new /var/usr/sbin/org.webosinternals.lumberjack
	novacom put file://home/root/luna_methods.c < luna_methods.c
	novacom put file://home/root/lumberjack < lumberjack

clobber:
	rm -rf *.o lumberjack
